import React from 'react';

export type TabType = 'hoy' | 'cuentas' | 'deudas' | 'historial';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 w-full z-40 pointer-events-none pb-safe">
      <div className="px-4 pb-4 w-full flex justify-center">
        <nav className="pointer-events-auto grid grid-cols-4 items-center w-full max-w-[370px] h-14 px-1 bg-white/85 backdrop-blur-xl rounded-full shadow-sm border border-black/[0.04]">
          {/* Tab 1: Hoy */}
          <button
            type="button"
            onClick={() => onTabChange('hoy')}
            className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
              activeTab === 'hoy' ? 'text-[#111827] font-semibold' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: activeTab === 'hoy' ? "'FILL' 1" : "'FILL' 0" }}
            >
              calendar_today
            </span>
            <span className="text-[10px] mt-0.5">Hoy</span>
          </button>

          {/* Tab 2: Cuentas */}
          <button
            type="button"
            onClick={() => onTabChange('cuentas')}
            className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
              activeTab === 'cuentas' ? 'text-[#111827] font-semibold' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: activeTab === 'cuentas' ? "'FILL' 1" : "'FILL' 0" }}
            >
              account_balance_wallet
            </span>
            <span className="text-[10px] mt-0.5">Cuentas</span>
          </button>

          {/* Tab 3: Deudas */}
          <button
            type="button"
            onClick={() => onTabChange('deudas')}
            className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
              activeTab === 'deudas' ? 'text-[#111827] font-semibold' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: activeTab === 'deudas' ? "'FILL' 1" : "'FILL' 0" }}
            >
              handshake
            </span>
            <span className="text-[10px] mt-0.5">Deudas</span>
          </button>

          {/* Tab 4: Historial */}
          <button
            type="button"
            onClick={() => onTabChange('historial')}
            className={`flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
              activeTab === 'historial' ? 'text-[#111827] font-semibold' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: activeTab === 'historial' ? "'FILL' 1" : "'FILL' 0" }}
            >
              receipt_long
            </span>
            <span className="text-[10px] mt-0.5">Historial</span>
          </button>
        </nav>
      </div>
    </div>
  );
};