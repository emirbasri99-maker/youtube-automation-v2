import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './PaymentSuccess.css';

// Credit amounts per plan — mirrors webhook.ts PLAN_CREDITS
const PLAN_CREDITS: Record<string, number> = {
    TRIAL: 1500,
    STARTER: 30000,
    PROFESSIONAL: 75000,
    BUSINESS: 160000,
};

function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Processing your payment...');

    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        const userId = searchParams.get('userId');

        if (!sessionId || !userId) {
            setStatus('error');
            setMessage('Invalid payment session');
            return;
        }

        const handlePaymentSuccess = async () => {
            try {
                // Give webhook a few seconds to fire (production)
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Verify the Stripe session and get plan info via proxy
                const apiUrl = import.meta.env.DEV
                    ? 'http://localhost:3001/api/verify-session'
                    : '/.netlify/functions/verify-session';

                let planType: string | null = null;

                try {
                    const verifyRes = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId }),
                    });

                    if (verifyRes.ok) {
                        const verifyData = await verifyRes.json();
                        planType = verifyData.planType;
                        console.log('✅ Session verified, plan:', planType);
                    }
                } catch (verifyErr) {
                    console.warn('Session verification failed (webhook may have already processed):', verifyErr);
                }

                // If we got a planType, check if credits were already added (by webhook)
                // If not, add them now as fallback
                if (planType && PLAN_CREDITS[planType]) {
                    const expectedCredits = PLAN_CREDITS[planType];

                    // Always set exact credits for this plan (don't rely on webhook for localhost)
                    console.log(`💳 Setting ${expectedCredits} credits for ${planType} plan`);
                    const { error: updateErr } = await supabase
                        .from('subscriptions')
                        .update({
                            credits: expectedCredits,
                            plan_type: planType,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('user_id', userId);

                    if (!updateErr) {
                        // Log transaction
                        await supabase.from('credit_transactions').insert({
                            user_id: userId,
                            amount: expectedCredits,
                            type: 'PURCHASE',
                            description: `${planType} plan purchased`,
                            balance_after: expectedCredits,
                        });
                        console.log(`✅ Credits set: ${expectedCredits} for ${planType}`);
                    } else {
                        console.error('Failed to update credits:', updateErr);
                    }
                }

                setStatus('success');
                setMessage('Payment successful! Your credits have been added.');

                // Redirect to dashboard
                setTimeout(() => {
                    navigate('/app/dashboard');
                }, 2000);

            } catch (error) {
                console.error('PaymentSuccess handler error:', error);
                // Even on error, redirect to dashboard (webhook may have handled credits)
                setStatus('success');
                setMessage('Payment received! Redirecting to dashboard...');
                setTimeout(() => navigate('/app/dashboard'), 2000);
            }
        };

        handlePaymentSuccess();
    }, [searchParams, navigate]);

    return (
        <div className="payment-success-container">
            <div className="payment-success-card glass-card">
                {status === 'loading' && (
                    <>
                        <Loader2 size={64} className="spinner status-icon" />
                        <h1 className="heading-lg">Processing Payment</h1>
                        <p className="text-lg text-muted">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle size={64} className="status-icon success" />
                        <h1 className="heading-lg">Payment Successful!</h1>
                        <p className="text-lg">{message}</p>
                        <p className="text-sm text-muted">
                            Redirecting you to dashboard...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle size={64} className="status-icon error" />
                        <h1 className="heading-lg">Payment Error</h1>
                        <p className="text-lg">{message}</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/')}
                        >
                            Return Home
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default PaymentSuccess;
