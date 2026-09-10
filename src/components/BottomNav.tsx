import React from 'react';

export type TabType = 'hoy' | 'cuentas' | 'historial';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 w-full z-40 pointer-events-none pb-safe">
      <div className="px-5 pb-4 w-full flex justify-center">
        <nav className="pointer-events-auto grid grid-cols-3 items-center w-full max-w-[340px] h-14 px-2 bg-white/85 backdrop-blur-xl rounded-full shadow-[0_8px_32px_rgba(17,24,39,0.06)] border border-black/[0.04]">
          {/* Tab 1: Hoy */}
          <button
            type="button"
            onClick={() => onTabChange('hoy')}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
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
            className={`flex flex-col items-center justify-center h-full transition-colors ${
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

          {/* Tab 3: Historial */}
          <button
            type="button"
            onClick={() => onTabChange('historial')}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
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