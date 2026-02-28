// Creates separate Stripe products + prices for each plan and updates .env
// Run: node scripts/create-stripe-plans.mjs

import { readFileSync, writeFileSync } from 'fs';
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

async function stripe(path, method = 'GET', body = null) {
    const res = await fetch(`https://api.stripe.com/v1${path}`, {
        method,
        headers: {
            'Authorization': `Basic ${Buffer.from(STRIPE_SECRET + ':').toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body ? new URLSearchParams(body).toString() : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Stripe ${path}: ${data.error?.message}`);
    return data;
}

const plans = [
    {
        envKey: 'VITE_STRIPE_PRICE_TRIAL',
        name: 'Trial Plan',
        description: '1,500 Credits - Try our platform with limited credits',
        amount: 100,        // $1.00 in cents
        mode: 'payment',   // one-time
        interval: null,
    },
    {
        envKey: 'VITE_STRIPE_PRICE_STARTER',
        name: 'Starter Plan',
        description: '30,000 Credits/Month - Perfect for content creators getting started',
        amount: 2900,       // $29.00 in cents
        mode: 'subscription',
        interval: 'month',
    },
    {
        envKey: 'VITE_STRIPE_PRICE_PROFESSIONAL',
        name: 'Professional Plan',
        description: '75,000 Credits/Month - For serious creators scaling their content',
        amount: 6900,       // $69.00 in cents
        mode: 'subscription',
        interval: 'month',
    },
    {
        envKey: 'VITE_STRIPE_PRICE_BUSINESS',
        name: 'Business Plan',
        description: '160,000 Credits/Month - For agencies and power users',
        amount: 14900,      // $149.00 in cents
        mode: 'subscription',
        interval: 'month',
    },
];

const newPriceIds = {};

console.log('🚀 Creating separate Stripe products and prices...\n');

for (const plan of plans) {
    try {
        // 1. Create a separate product for this plan
        const product = await stripe('/products', 'POST', {
            name: plan.name,
            description: plan.description,
        });
        console.log(`✅ Created product: ${product.name} (${product.id})`);

        // 2. Create a price for this product
        const priceBody = {
            product: product.id,
            unit_amount: plan.amount,
            currency: 'usd',
        };

        if (plan.interval) {
            priceBody['recurring[interval]'] = plan.interval;
        }

        const price = await stripe('/prices', 'POST', priceBody);
        console.log(`   Price: ${price.id} ($${plan.amount / 100}${plan.interval ? '/month' : ' one-time'})`);

        newPriceIds[plan.envKey] = price.id;
        console.log('');
    } catch (err) {
        console.error(`❌ Failed for ${plan.name}: ${err.message}`);
    }
}

// 3. Update .env file with new price IDs
let updatedEnv = envContent;
for (const [key, value] of Object.entries(newPriceIds)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(updatedEnv)) {
        updatedEnv = updatedEnv.replace(regex, `${key}=${value}`);
    } else {
        updatedEnv += `\n${key}=${value}`;
    }
}

writeFileSync(envPath, updatedEnv, 'utf8');

console.log('📝 Updated .env with new price IDs:');
for (const [key, value] of Object.entries(newPriceIds)) {
    console.log(`   ${key}=${value}`);
}
console.log('\n✅ Done! Restart the frontend (npm run dev) to apply new price IDs.');
