import { useState } from 'react';
import { Coins, TrendingUp, Plus } from 'lucide-react';
import './CreditDisplay.css';

interface CreditDisplayProps {
    credits: number;
    maxCredits: number;
    planName: string;
    onAddCredits?: () => void;
}

function CreditDisplay({ credits, maxCredits, planName, onAddCredits }: CreditDisplayProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    const percentage = (credits / maxCredits) * 100;
    const isLow = percentage < 20;
    const isMedium = percentage >= 20 && percentage < 50;

    return (
        <div
            className="credit-display"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className="credit-header">
                <div className="credit-icon">
                    <Coins size={18} />
                </div>
                <div className="credit-info">
                    <span className="credit-label">Credits</span>
                    <span className={`credit-amount ${isLow ? 'low' : isMedium ? 'medium' : ''}`}>
                        {credits.toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="credit-bar">
                <div
                    className={`credit-bar-fill ${isLow ? 'low' : isMedium ? 'medium' : ''}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>

            {showTooltip && (
                <div className="credit-tooltip">
                    <div className="tooltip-row">
                        <span>Plan:</span>
                        <strong>{planName}</strong>
                    </div>
                    <div className="tooltip-row">
                        <span>Remaining:</span>
                        <strong>{credits.toLocaleString()} / {maxCredits.toLocaleString()}</strong>
                    </div>
                    <div className="tooltip-row">
                        <span>Usage:</span>
                        <strong>{percentage.toFixed(0)}%</strong>
                    </div>

                    {isLow && (
                        <div className="tooltip-warning">
                            ⚠️ Krediniz azalıyor! Planınızı yükseltin.
                        </div>
                    )}

                    {onAddCredits && (
                        <button
                            className="btn btn-primary btn-sm tooltip-btn"
                            onClick={onAddCredits}
                        >
                            <Plus size={14} />
                            Add Credits
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default CreditDisplay;
