// One-time script to update Stripe product names and descriptions
// Run: node scripts/update-stripe-products.mjs

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually
const envPath = resolve(process.cwd(), '.env');
const envContent = readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) env[key.trim()] = rest.join('=').trim();
}

const STRIPE_SECRET = env.STRIPE_SECRET_KEY;
const plans = [
    {
        priceId: env.VITE_STRIPE_PRICE_TRIAL,
        name: 'Trial Plan',
        description: '1,500 Credits - Try our platform with limited credits',
        price: '$1/month'
    },
    {
        priceId: env.VITE_STRIPE_PRICE_STARTER,
        name: 'Starter Plan',
        description: '30,000 Credits/Month - Perfect for content creators getting started',
        price: '$29/month'
    },
    {
        priceId: env.VITE_STRIPE_PRICE_PROFESSIONAL,
        name: 'Professional Plan',
        description: '75,000 Credits/Month - For serious creators scaling their content',
        price: '$69/month'
    },
    {
        priceId: env.VITE_STRIPE_PRICE_BUSINESS,
        name: 'Business Plan',
        description: '160,000 Credits/Month - For agencies and power users',
        price: '$149/month'
    },
];

async function stripeRequest(path, method = 'GET', body = null) {
    const res = await fetch(`https://api.stripe.com/v1${path}`, {
        method,
        headers: {
            'Authorization': `Basic ${Buffer.from(STRIPE_SECRET + ':').toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body ? new URLSearchParams(body).toString() : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Stripe error: ${data.error?.message || JSON.stringify(data)}`);
    return data;
}

console.log('🔧 Updating Stripe product names and descriptions...\n');

for (const plan of plans) {
    if (!plan.priceId) {
        console.warn(`⚠️ Skipping ${plan.name} — no priceId in .env`);
        continue;
    }

    try {
        // Get the price to find its associated product
        const price = await stripeRequest(`/prices/${plan.priceId}`);
        const productId = price.product;

        console.log(`📦 ${plan.name}`);
        console.log(`   Price ID: ${plan.priceId}`);
        console.log(`   Product ID: ${productId}`);

        // Update the product name and description
        const updated = await stripeRequest(`/products/${productId}`, 'POST', {
            name: plan.name,
            description: plan.description,
        });

        console.log(`   ✅ Updated → "${updated.name}" | "${updated.description}"\n`);
    } catch (err) {
        console.error(`   ❌ Failed to update ${plan.name}: ${err.message}\n`);
    }
}

console.log('✅ Done! Stripe products updated. Refresh the checkout page to see changes.');
