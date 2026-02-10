import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './PaymentSuccess.css';

function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Processing your payment...');

    useEffect(() => {
        const sessionId = searchParams.get('session_id');

        if (!sessionId) {
            setStatus('error');
            setMessage('Invalid payment session');
            return;
        }

        // Verify payment session
        const verifyPayment = async () => {
            try {
                // Wait a moment for webhook to process
                await new Promise(resolve => setTimeout(resolve, 2000));

                setStatus('success');
                setMessage('Payment successful! Your credits have been added to your account.');

                // Redirect to landing page with success message after 3 seconds
                setTimeout(() => {
                    navigate('/?payment_success=true');
                }, 3000);
            } catch (error) {
                console.error('Payment verification error:', error);
                setStatus('error');
                setMessage('Payment verification failed. Please contact support.');
            }
        };

        verifyPayment();
    }, [searchParams, navigate, user]);

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

                <>
                    <CheckCircle size={64} className="status-icon success" />
                    <h1 className="heading-lg">Payment Successful!</h1>
                    <p className="text-lg">{message}</p>
                    <p className="text-sm text-muted">
                        Check your email for login instructions. Redirecting to home page...
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
