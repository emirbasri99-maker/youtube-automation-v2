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
    TRIAL: 1500,
    STARTER: 30000,
    PROFESSIONAL: 75000,
    BUSINESS: 160000,
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

                // Check if user exists in profiles table
                const { data: existingProfile, error: findError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', email)
                    .single();

                // Also try finding by userId from metadata if email lookup fails
                const lookupId = existingProfile?.id || userId;

                if (findError && findError.code !== 'PGRST116') {
                    console.error('Error finding user profile:', findError);
                    break;
                }

                if (lookupId && lookupId !== 'guest') {
                    // User exists — update subscriptions table with correct plan + credits
                    console.log(`Updating subscription for user ${lookupId}: ${planType} = ${credits} credits`);

                    const { error: updateError } = await supabase
                        .from('subscriptions')
                        .update({
                            credits: credits, // Set exact credits for this plan (not additive)
                            plan_type: planType,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('user_id', lookupId);

                    if (updateError) {
                        console.error('Error updating subscription:', updateError);
                    } else {
                        console.log(`✅ Set ${credits} credits for user ${lookupId} on ${planType} plan`);
                    }

                    // Log the transaction
                    await supabase.from('credit_transactions').insert({
                        user_id: lookupId,
                        amount: credits,
                        type: 'PURCHASE',
                        description: `${planType} plan purchased via Stripe`,
                        balance_after: credits,
                    });
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
