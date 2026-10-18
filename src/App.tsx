import { useEffect, useState } from 'react';
import { Bus, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { PendingPage } from '@/pages/PendingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { AdminLoginPage } from '@/pages/AdminLoginPage';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-primary-500 font-cairo flex flex-col items-center justify-center text-white" dir="rtl">
      <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mb-4 animate-scale-in">
        <Bus className="w-9 h-9" />
      </div>
      <h1 className="text-2xl font-bold mb-4">CityGo</h1>
      <Loader2 className="w-6 h-6 animate-spin text-white/70" />
    </div>
  );
}

function AppRouter() {
  const { screen, navigate, isAdmin } = useAuth();
  const [hash, setHash] = useState(window.location.hash.replace('#', ''));

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash.replace('#', ''));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Direct #admin URL
  if (hash === 'admin') {
    // Already logged in as admin -> show dashboard
    if (isAdmin && (screen === 'admin' || screen === 'loading')) return <AdminDashboardPage />;
    // Still loading session -> wait
    if (screen === 'loading') return <LoadingScreen />;
    // Logged in but not admin (or admin still setting up) -> show admin login
    if (!isAdmin) {
      return (
        <AdminLoginPage
          onSuccess={() => navigate('admin')}
          onBack={() => { window.location.hash = ''; navigate('login'); }}
        />
      );
    }
    // Fallback: admin is true, show dashboard
    return <AdminDashboardPage />;
  }

  switch (screen) {
    case 'loading':
      return <LoadingScreen />;
    case 'login':
      return <LoginPage onNavigateRegister={() => navigate('register')} />;
    case 'register':
      return <RegisterPage onNavigateLogin={() => navigate('login')} />;
    case 'pending':
      return <PendingPage />;
    case 'dashboard':
      return <DashboardPage />;
    case 'admin':
      return <AdminDashboardPage />;
    default:
      return <LoadingScreen />;
  }
}

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
