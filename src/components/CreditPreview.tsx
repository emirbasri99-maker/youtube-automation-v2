import { AlertCircle, TrendingUp } from 'lucide-react';
import './CreditPreview.css';

interface CreditPreviewProps {
    estimatedCost: number;
    currentBalance: number;
    operation?: string;
}

function CreditPreview({ estimatedCost, currentBalance, operation = 'This operation' }: CreditPreviewProps) {
    const sufficient = currentBalance >= estimatedCost;
    const shortfall = Math.max(0, estimatedCost - currentBalance);

    return (
        <div className={`credit-preview ${sufficient ? 'sufficient' : 'insufficient'}`}>
            <div className="credit-preview-header">
                {sufficient ? (
                    <TrendingUp size={20} className="preview-icon" />
                ) : (
                    <AlertCircle size={20} className="preview-icon" />
                )}
                <span className="preview-label">Tahmini Maliyet</span>
            </div>

            <div className="credit-preview-content">
                <div className="cost-amount">
                    <span className="cost-value">{estimatedCost.toLocaleString('tr-TR')}</span>
                    <span className="cost-unit">Credits</span>
                </div>

                <div className="balance-info">
                    <span className="balance-label">Current Balance:</span>
                    <span className={`balance-value ${sufficient ? 'sufficient' : 'insufficient'}`}>
                        {currentBalance.toLocaleString('en-US')} Credits
                    </span>
                </div>

                {!sufficient && (
                    <div className="shortfall-warning">
                        <AlertCircle size={16} />
                        <span>
                            {shortfall.toLocaleString('tr-TR')} kredi eksik!
                            Lütfen planınızı yükseltin.
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CreditPreview;
