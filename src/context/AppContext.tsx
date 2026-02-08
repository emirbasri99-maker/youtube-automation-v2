import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, YouTubeChannel, Notification, AppState } from '../types';

interface AppContextType extends AppState {
    setUser: (user: User | null) => void;
    setChannel: (channel: YouTubeChannel | null) => void;
    setLoading: (loading: boolean) => void;
    addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
    removeNotification: (id: string) => void;
    connectYouTube: () => Promise<void>;
    disconnectYouTube: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mock user data for demo
const mockUser: User = {
    id: '1',
    email: 'demo@youtubeauto.com',
    name: 'Demo Kullanıcı',
    avatar: undefined,
    plan: 'pro',
    createdAt: new Date().toISOString(),
};

// Mock channel data for demo
const mockChannel: YouTubeChannel = {
    id: 'UC123456789',
    title: 'Demo YouTube Kanalı',
    description: 'Bu bir demo kanalıdır',
    thumbnail: '',
    subscriberCount: 15420,
    videoCount: 87,
    viewCount: 1250000,
    isConnected: true,
};

export function AppProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(mockUser);
    const [channel, setChannel] = useState<YouTubeChannel | null>(mockChannel);
    const [isLoading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
        const newNotification: Notification = {
            ...notification,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
        };
        setNotifications((prev) => [...prev, newNotification]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            removeNotification(newNotification.id);
        }, 5000);
    };

    const removeNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const connectYouTube = async () => {
        setLoading(true);
        // Simulate OAuth flow
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setChannel(mockChannel);
        setLoading(false);
        addNotification({
            type: 'success',
            title: 'YouTube Bağlandı',
            message: 'Kanalınız başarıyla bağlandı!',
        });
    };

    const disconnectYouTube = () => {
        setChannel(null);
        addNotification({
            type: 'info',
            title: 'YouTube Bağlantısı Kesildi',
            message: 'Kanalınızın bağlantısı kaldırıldı.',
        });
    };

    const value: AppContextType = {
        user,
        channel,
        isLoading,
        isAuthenticated: !!user,
        notifications,
        setUser,
        setChannel,
        setLoading,
        addNotification,
        removeNotification,
        connectYouTube,
        disconnectYouTube,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}
