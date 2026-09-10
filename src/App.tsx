import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { BottomNav, type TabType } from './components/BottomNav';

const MainApp: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('hoy');

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#111827]/20 border-t-[#111827] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-between max-w-md mx-auto w-full relative shadow-sm">
      {activeTab === 'hoy' && (
        <Dashboard onOpenProfile={() => signOut()} />
      )}

      {activeTab === 'cuentas' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-[#6B7280]">
          <p className="font-semibold text-sm text-[#111827] mb-1">Pestaña Cuentas</p>
          <p>La vista detallada de cuentas será montada en el siguiente paso.</p>
        </div>
      )}

      {activeTab === 'historial' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-[#6B7280]">
          <p className="font-semibold text-sm text-[#111827] mb-1">Pestaña Historial</p>
          <p>El historial completo con filtros será montado en el siguiente paso.</p>
        </div>
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}