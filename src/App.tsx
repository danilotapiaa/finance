import React, { lazy, Suspense, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { AuthProvider } from './context/AuthProvider';
import { PreferencesProvider } from './context/PreferencesProvider';
import { ThemeProvider } from './context/ThemeProvider';
import { AuthScreen } from './components/AuthScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BottomNav, type TabType } from './components/BottomNav';

const Dashboard = lazy(() =>
  import('./components/Dashboard').then((module) => ({ default: module.Dashboard }))
);
const AccountsScreen = lazy(() =>
  import('./components/AccountsScreen').then((module) => ({ default: module.AccountsScreen }))
);
const DebtsScreen = lazy(() =>
  import('./components/DebtsScreen').then((module) => ({ default: module.DebtsScreen }))
);
const HistoryScreen = lazy(() =>
  import('./components/HistoryScreen').then((module) => ({ default: module.HistoryScreen }))
);
const SettingsScreen = lazy(() =>
  import('./components/SettingsScreen').then((module) => ({ default: module.SettingsScreen }))
);

const ScreenFallback: React.FC = () => (
  <div className="flex-1 flex items-center justify-center min-h-[60vh]">
    <div className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin"></div>
  </div>
);

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('hoy');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-canvas flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between max-w-md mx-auto w-full relative shadow-sm">
      {isSettingsOpen ? (
        <Suspense fallback={<ScreenFallback />}>
          <SettingsScreen onClose={() => setIsSettingsOpen(false)} />
        </Suspense>
      ) : (
        <>
          <Suspense fallback={<ScreenFallback />}>
            {activeTab === 'hoy' && (
              <Dashboard onOpenProfile={() => setIsSettingsOpen(true)} />
            )}

            {activeTab === 'cuentas' && (
              <AccountsScreen />
            )}

            {activeTab === 'deudas' && (
              <DebtsScreen />
            )}

            {activeTab === 'historial' && (
              <HistoryScreen />
            )}
          </Suspense>

          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <PreferencesProvider>
            <MainApp />
          </PreferencesProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
