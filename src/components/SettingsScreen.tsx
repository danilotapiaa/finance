import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../services/financeService';
import type { Profile } from '../types/database';

interface SettingsScreenProps {
  onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Estados locales de preferencias
  const [currency, setCurrency] = useState('USD');
  const [numberFormat, setNumberFormat] = useState('14,850.00');
  const [firstDayOfWeek, setFirstDayOfWeek] = useState('Lunes');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [discreteModeAuto, setDiscreteModeAuto] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await financeService.getProfile();
        if (data) {
          setProfile(data);
          setCurrency(data.currency || 'USD');
          setNumberFormat(data.number_format || '14,850.00');
          setFirstDayOfWeek(data.first_day_of_week === 'sunday' ? 'Domingo' : 'Lunes');
          setBiometricEnabled(data.biometric_enabled || false);
          setDiscreteModeAuto(data.discrete_mode_auto || false);
        }
      } catch (err) {
        console.error('Error cargando perfil:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSavePreference = async (updates: Partial<Profile>) => {
    try {
      await financeService.updateProfile(updates);
      setStatusMessage('Preferencia guardada');
      setTimeout(() => setStatusMessage(null), 2000);
    } catch (err) {
      console.error('Error actualizando perfil:', err);
    }
  };

  // Exportar todas las transacciones reales a CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const transactions = await financeService.getTransactions(1000);
      if (transactions.length === 0) {
        alert('No tienes transacciones registradas para exportar.');
        setIsExporting(false);
        return;
      }

      const headers = ['ID', 'Fecha', 'Tipo', 'Monto', 'Cuenta', 'Categoría', 'Nota'];
      const rows = transactions.map((t) => [
        t.id,
        t.date,
        t.type === 'income' ? 'Ingreso' : 'Gasto',
        Number(t.amount).toFixed(2),
        t.account?.name || 'Cuenta activa',
        t.category?.name || 'Sin categoría',
        `"${(t.note || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `serene_movimientos_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar CSV:', err);
      alert('Ocurrió un error al exportar los datos.');
    } finally {
      setIsExporting(false);
    }
  };

  const userName = profile?.full_name || user?.user_metadata?.full_name || 'Danilo Tapia';
  const userInitials = (userName || 'U')
    .split(' ')
    .filter(Boolean)
    .map((part: string) => part.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#111827]/20 border-t-[#111827] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full bg-[#F8F9FA] text-[#111827] relative min-h-screen">
      {/* Header Fijo con botón Listo */}
      <header className="sticky top-0 w-full z-30 bg-[#F8F9FA]/90 backdrop-blur-xl border-b border-black/[0.04]">
        <div className="h-16 px-5 flex items-center justify-between w-full">
          <h1 className="text-[24px] font-bold text-[#111827] tracking-tight">Ajustes</h1>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-white border border-black/10 text-xs font-semibold text-[#111827] shadow-sm active:scale-95 transition-transform hover:bg-neutral-50 cursor-pointer"
          >
            Listo
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 px-5 pt-4 pb-20 space-y-5">
        {statusMessage && (
          <div className="p-2.5 bg-[#E8F5EE] text-[#2E7D56] rounded-xl text-xs font-medium text-center border border-[#2E7D56]/15">
            {statusMessage}
          </div>
        )}

        {/* Tarjeta de Perfil Hero */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/[0.05] flex items-center space-x-3.5">
          <div className="w-[52px] h-[52px] rounded-full bg-[#E5E7EB] border border-black/5 flex items-center justify-center text-[#111827] font-semibold text-base tracking-tight flex-shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-semibold text-[#111827] truncate tracking-tight">{userName}</h2>
            <p className="text-[12px] text-[#6B7280] truncate">{user?.email}</p>
            <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8F5EE] text-[10px] font-semibold text-[#2E7D56] border border-[#2E7D56]/15">
              <span className="material-symbols-outlined text-[12px]">shield</span>
              <span>Bóveda Local Encriptada</span>
            </div>
          </div>
        </section>

        {/* Sección 1: Preferencias Generales */}
        <section className="space-y-1.5">
          <h3 className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Preferencias Generales</h3>
          <div className="bg-white rounded-2xl border border-black/[0.05] divide-y divide-black/[0.05] shadow-sm overflow-hidden text-xs">
            {/* Moneda Principal */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] text-[#111827] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[17px]">payments</span>
                </div>
                <span className="text-[13px] font-medium text-[#111827]">Moneda Principal</span>
              </div>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  handleSavePreference({ currency: e.target.value });
                }}
                className="bg-transparent text-[13px] font-medium text-[#6B7280] outline-none cursor-pointer text-right"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="COP">COP ($)</option>
                <option value="MXN">MXN ($)</option>
              </select>
            </div>

            {/* Formato de Decimales */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] text-[#111827] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[17px]">tag</span>
                </div>
                <span className="text-[13px] font-medium text-[#111827]">Formato de decimales</span>
              </div>
              <select
                value={numberFormat}
                onChange={(e) => {
                  setNumberFormat(e.target.value);
                  handleSavePreference({ number_format: e.target.value });
                }}
                className="bg-transparent text-[13px] font-medium text-[#6B7280] outline-none cursor-pointer text-right"
              >
                <option value="14,850.00">14,850.00</option>
                <option value="14.850,00">14.850,00</option>
              </select>
            </div>

            {/* Primer día de la semana */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] text-[#111827] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[17px]">calendar_today</span>
                </div>
                <span className="text-[13px] font-medium text-[#111827]">Inicio de semana</span>
              </div>
              <select
                value={firstDayOfWeek}
                onChange={(e) => {
                  setFirstDayOfWeek(e.target.value);
                  handleSavePreference({ first_day_of_week: e.target.value === 'Domingo' ? 'sunday' : 'monday' });
                }}
                className="bg-transparent text-[13px] font-medium text-[#6B7280] outline-none cursor-pointer text-right"
              >
                <option value="Lunes">Lunes</option>
                <option value="Domingo">Domingo</option>
              </select>
            </div>
          </div>
        </section>

        {/* Sección 2: Seguridad y Privacidad */}
        <section className="space-y-1.5">
          <h3 className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Seguridad y Privacidad</h3>
          <div className="bg-white rounded-2xl border border-black/[0.05] divide-y divide-black/[0.05] shadow-sm overflow-hidden text-xs">
            {/* Bloqueo Biométrico */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] text-[#111827] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[17px]">lock</span>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#111827]">Bloqueo con Face ID / PIN</p>
                  <p className="text-[11px] text-[#6B7280]">Requerir credenciales al abrir la app</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={biometricEnabled}
                onClick={() => {
                  const newVal = !biometricEnabled;
                  setBiometricEnabled(newVal);
                  handleSavePreference({ biometric_enabled: newVal });
                }}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ease-in-out duration-200 ${
                  biometricEnabled ? 'bg-[#111827]' : 'bg-[#E5E7EB]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition ease-in-out duration-200 ${
                    biometricEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Modo discreto automático */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] text-[#111827] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[17px]">visibility_off</span>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#111827]">Modo discreto automático</p>
                  <p className="text-[11px] text-[#6B7280]">Ocultar saldos por defecto al iniciar</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={discreteModeAuto}
                onClick={() => {
                  const newVal = !discreteModeAuto;
                  setDiscreteModeAuto(newVal);
                  handleSavePreference({ discrete_mode_auto: newVal });
                }}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ease-in-out duration-200 ${
                  discreteModeAuto ? 'bg-[#111827]' : 'bg-[#E5E7EB]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition ease-in-out duration-200 ${
                    discreteModeAuto ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Sección 3: Datos y Respaldo */}
        <section className="space-y-1.5">
          <h3 className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Datos y Respaldo</h3>
          <div className="bg-white rounded-2xl border border-black/[0.05] divide-y divide-black/[0.05] shadow-sm overflow-hidden text-xs">
            {/* Exportar movimientos a CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] text-[#111827] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[17px]">ios_share</span>
                </div>
                <div>
                  <span className="text-[13px] font-medium text-[#111827] block">Exportar movimientos (CSV)</span>
                  <span className="text-[11px] text-[#6B7280]">Descarga una copia completa de tus finanzas</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-[#9CA3AF]">
                {isExporting ? 'hourglass_empty' : 'download'}
              </span>
            </button>
          </div>
        </section>

        {/* Sección 4: Sesión */}
        <section className="pt-2">
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full h-11 bg-[#FDF2F0] hover:bg-[#FBE8E5] border border-[#C25E4A]/15 rounded-2xl text-xs font-semibold text-[#C25E4A] flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Cerrar Sesión</span>
          </button>
        </section>

        {/* Pie de versión */}
        <footer className="pt-4 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D56]"></span>
            <span>SERENE FINANCE • V1.0.0</span>
          </div>
          <p className="text-[11px] text-[#6B7280]">Tus datos viven protegidos en tu base de datos de Supabase.</p>
        </footer>
      </main>
    </div>
  );
};