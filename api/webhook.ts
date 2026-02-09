import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
});

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
                // TODO: Update user subscription in database
                break;

            case 'customer.subscription.created':
                const subscriptionCreated = event.data.object as Stripe.Subscription;
                console.log('Subscription created:', subscriptionCreated.id);
                // TODO: Handle subscription creation
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
