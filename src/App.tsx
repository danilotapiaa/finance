import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { AuthProvider } from './context/AuthProvider';
import { ThemeProvider } from './context/ThemeProvider';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { AccountsScreen } from './components/AccountsScreen';
import { DebtsScreen } from './components/DebtsScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { BottomNav, type TabType } from './components/BottomNav';

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
        <SettingsScreen onClose={() => setIsSettingsOpen(false)} />
      ) : (
        <>
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

          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}