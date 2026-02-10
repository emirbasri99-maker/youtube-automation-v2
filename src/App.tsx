import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import LongVideoCreate from './pages/LongVideoCreate';
import ShortsCreate from './pages/ShortsCreate';
import Transcribe from './pages/Transcribe';
import Settings from './pages/Settings';
import Library from './pages/Library';
import TrendAnalyzer from './pages/TrendAnalyzer';
import PaymentSuccess from './pages/PaymentSuccess';

function App() {
    return (
        <AuthProvider>
            <SubscriptionProvider>
                <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/auth/payment-success" element={<PaymentSuccess />} />

                    {/* Protected routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/app" element={<Layout />}>
                            <Route index element={<Navigate to="/app/dashboard" replace />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="library" element={<Library />} />
                            <Route path="trends" element={<TrendAnalyzer />} />
                            <Route path="video/create" element={<LongVideoCreate />} />
                            <Route path="shorts/create" element={<ShortsCreate />} />
                            <Route path="transcribe" element={<Transcribe />} />
                            <Route path="settings" element={<Settings />} />
                        </Route>
                    </Route>
                </Routes>
            </SubscriptionProvider>
        </AuthProvider>
    );
}

export default App;
