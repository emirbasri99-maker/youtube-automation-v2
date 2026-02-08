import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Notifications.css';

const iconMap = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

function Notifications() {
    const { notifications, removeNotification } = useApp();

    if (notifications.length === 0) return null;

    return (
        <div className="notifications-container">
            {notifications.map((notification) => {
                const Icon = iconMap[notification.type];
                return (
                    <div
                        key={notification.id}
                        className={`notification-toast ${notification.type}`}
                    >
                        <Icon size={20} className="notification-icon" />
                        <div className="notification-content">
                            <span className="notification-title">{notification.title}</span>
                            <span className="notification-message">{notification.message}</span>
                        </div>
                        <button
                            className="notification-close"
                            onClick={() => removeNotification(notification.id)}
                        >
                            <X size={16} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

export default Notifications;
