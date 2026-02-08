import { X, Crown, Zap, ArrowRight } from 'lucide-react';
import { PlanType, getPlan } from '../config/plans';
import './UpgradeModal.css';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPlan: PlanType;
    requiredPlan: PlanType;
    feature: string;
    onUpgrade?: (planType: PlanType) => void;
}

function UpgradeModal({
    isOpen,
    onClose,
    currentPlan,
    requiredPlan,
    feature,
    onUpgrade
}: UpgradeModalProps) {
    if (!isOpen) return null;

    const current = getPlan(currentPlan);
    const required = getPlan(requiredPlan);

    return (
        <>
            <div className="modal-backdrop" onClick={onClose} />
            <div className="upgrade-modal glass-card">
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="modal-icon">
                    <Crown size={48} />
                </div>

                <h2 className="modal-title">Upgrade Required</h2>
                <p className="modal-description">
                    <strong>{feature}</strong> is not available on your current plan.
                    Upgrade to <strong>{required.name}</strong> to unlock this feature.
                </p>

                <div className="plan-comparison">
                    <div className="plan-column current">
                        <div className="plan-badge">
                            <Zap size={16} />
                            Current Plan
                        </div>
                        <h3>{current.name}</h3>
                        <div className="plan-price">
                            <span className="price">${current.price}</span>
                            <span className="period">/mo</span>
                        </div>
                        <div className="plan-credits">
                            {current.credits.toLocaleString()} credits
                        </div>
                    </div>

                    <div className="arrow-divider">
                        <ArrowRight size={24} />
                    </div>

                    <div className="plan-column required">
                        <div className="plan-badge highlight">
                            <Crown size={16} />
                            Recommended
                        </div>
                        <h3>{required.name}</h3>
                        <div className="plan-price">
                            <span className="price">${required.price}</span>
                            <span className="period">/mo</span>
                        </div>
                        <div className="plan-credits">
                            {required.credits.toLocaleString()} credits
                        </div>
                    </div>
                </div>

                <div className="modal-features">
                    <h4>What you'll get:</h4>
                    <ul>
                        <li>✅ {(required.credits - current.credits).toLocaleString()} more credits per month</li>
                        <li>✅ Access to {feature}</li>
                        {required.features.stockVideoAccess && !current.features.stockVideoAccess && (
                            <li>✅ Pexels Stock Video Library</li>
                        )}
                        {required.features.hd1080pRender && !current.features.hd1080pRender && (
                            <li>✅ 1080p HD Rendering</li>
                        )}
                        {required.features.socialAutoPost && !current.features.socialAutoPost && (
                            <li>✅ Auto-Post to Social Media</li>
                        )}
                    </ul>
                </div>

                <div className="modal-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        Maybe Later
                    </button>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => {
                            onUpgrade?.(requiredPlan);
                            onClose();
                        }}
                    >
                        <Crown size={18} />
                        Upgrade to {required.name}
                    </button>
                </div>
            </div>
        </>
    );
}

export default UpgradeModal;
