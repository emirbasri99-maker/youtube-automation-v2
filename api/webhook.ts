import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

// Initialize Supabase client
const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for admin operations
);

// Plan credits mapping
const PLAN_CREDITS: Record<string, number> = {
    TRIAL: 400,
    STARTER: 2000,
    PROFESSIONAL: 10000,
    BUSINESS: 50000,
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET is not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            webhookSecret
        );
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                console.log('Checkout session completed:', session.id);
                console.log('Customer email:', session.customer_details?.email);
                console.log('Metadata:', session.metadata);

                const email = session.customer_details?.email;
                const planType = session.metadata?.planType;
                const userId = session.metadata?.userId;

                if (!email || !planType) {
                    console.error('Missing email or planType in session metadata');
                    break;
                }

                // Get credits for this plan
                const credits = PLAN_CREDITS[planType] || 0;

                // Check if user exists
                const { data: existingUser, error: findError } = await supabase
                    .from('users')
                    .select('id, credits')
                    .eq('email', email)
                    .single();

                if (findError && findError.code !== 'PGRST116') {
                    console.error('Error finding user:', findError);
                    break;
                }

                if (existingUser) {
                    // User exists - add credits and update plan
                    console.log('User exists, adding credits:', existingUser.id);

                    const { error: updateError } = await supabase
                        .from('users')
                        .update({
                            credits: (existingUser.credits || 0) + credits,
                            current_plan: planType,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', existingUser.id);

                    if (updateError) {
                        console.error('Error updating user:', updateError);
                    } else {
                        console.log(`Added ${credits} credits to user ${existingUser.id}`);
                    }
                } else if (userId === 'guest') {
                    // Create new user for guest checkout
                    console.log('Creating new user for email:', email);

                    // Generate temporary password
                    const tempPassword = Math.random().toString(36).slice(-12);

                    // Create auth user
                    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                        email,
                        password: tempPassword,
                        email_confirm: true, // Auto-confirm email
                    });

                    if (authError) {
                        console.error('Error creating auth user:', authError);
                        break;
                    }

                    console.log('Auth user created:', authData.user?.id);

                    // Create user profile with credits
                    const { error: profileError } = await supabase
                        .from('users')
                        .insert({
                            id: authData.user!.id,
                            email,
                            credits,
                            current_plan: planType,
                        });

                    if (profileError) {
                        console.error('Error creating user profile:', profileError);
                    } else {
                        console.log(`Created user ${authData.user!.id} with ${credits} credits`);

                        // TODO: Send welcome email with temporary password
                        console.log('Temporary password for', email, ':', tempPassword);
                    }
                }

                break;

            case 'customer.subscription.updated':
                const subscriptionUpdated = event.data.object as Stripe.Subscription;
                console.log('Subscription updated:', subscriptionUpdated.id);
                // TODO: Handle subscription update
                break;

            case 'customer.subscription.deleted':
                const subscriptionDeleted = event.data.object as Stripe.Subscription;
                console.log('Subscription deleted:', subscriptionDeleted.id);
                // TODO: Handle subscription cancellation
                break;

            case 'invoice.payment_succeeded':
                const invoice = event.data.object as Stripe.Invoice;
                console.log('Invoice payment succeeded:', invoice.id);
                // TODO: Handle successful payment
                break;

            case 'invoice.payment_failed':
                const failedInvoice = event.data.object as Stripe.Invoice;
                console.log('Invoice payment failed:', failedInvoice.id);
                // TODO: Handle failed payment
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return res.status(200).json({ received: true });
    } catch (err: any) {
        console.error('Error processing webhook:', err);
        return res.status(500).json({ error: 'Webhook processing failed' });
    }
}
