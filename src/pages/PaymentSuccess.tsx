import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './PaymentSuccess.css';

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
                // Wait for webhook to process payment and add credits (2 seconds)
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Check if user already has an active session
                const { data: { session } } = await supabase.auth.getSession();

                if (session && session.user.id === userId) {
                    // User is already logged in with correct account
                    console.log('✅ User already logged in, redirecting to dashboard');
                    setStatus('success');
                    setMessage('Payment successful! Your credits have been added.');

                    setTimeout(() => {
                        navigate('/app/dashboard');
                    }, 1500);
                } else {
                    // User not logged in or different account - show success message
                    setStatus('success');
                    setMessage('Payment successful! Your credits have been added. Please log in to access your dashboard.');

                    setTimeout(() => {
                        navigate('/');
                    }, 3000);
                }
            } catch (error) {
                console.error('Payment success handler error:', error);
                setStatus('error');
                setMessage('Payment was successful but there was an issue. Please contact support.');
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
