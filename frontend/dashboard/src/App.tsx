import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { PaymentDetailsPage } from '@/pages/PaymentDetailsPage';
import { WebhooksPage } from '@/pages/WebhooksPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { apiService } from '@/services/api';

function App() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiService.getProfile(),
    retry: false,
  });

  const isAuthenticated = !!profile;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/payments/:id" element={<PaymentDetailsPage />} />
        <Route path="/webhooks" element={<WebhooksPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
