import { X, AlertTriangle, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './InsufficientCreditsModal.css';

interface InsufficientCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    required: number;
    available: number;
    operation?: string;
}

function InsufficientCreditsModal({
    isOpen,
    onClose,
    required,
    available,
    operation = 'This operation'
}: InsufficientCreditsModalProps) {
    const navigate = useNavigate();
    const shortfall = required - available;

    if (!isOpen) return null;

    const handleUpgrade = () => {
        onClose();
        navigate('/settings', { state: { tab: 'billing' } });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content insufficient-credits-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="modal-icon-container">
                    <AlertTriangle size={48} className="warning-icon" />
                </div>

                <h2 className="modal-title">Insufficient Credits</h2>
                <p className="modal-description">
                    You don't have enough credits for {operation}.
                </p>

                <div className="credit-comparison">
                    <div className="credit-item required">
                        <span className="credit-label">Required</span>
                        <span className="credit-value">{required.toLocaleString('en-US')} Credits</span>
                    </div>

                    <div className="credit-divider">-</div>

                    <div className="credit-item available">
                        <span className="credit-label">Available</span>
                        <span className="credit-value">{available.toLocaleString('en-US')} Credits</span>
                    </div>

                    <div className="credit-divider">=</div>

                    <div className="credit-item shortfall">
                        <span className="credit-label">Shortage</span>
                        <span className="credit-value">{shortfall.toLocaleString('en-US')} Credits</span>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn btn-primary" onClick={handleUpgrade}>
                        <TrendingUp size={18} />
                        Upgrade Plan
                    </button>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default InsufficientCreditsModal;
