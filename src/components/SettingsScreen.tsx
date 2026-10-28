import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { financeService } from '../services/financeService';
import { THEMES } from '../theme/themes';
import type { Profile } from '../types/database';

interface SettingsScreenProps {
  onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Estados locales de preferencias
  const [currency, setCurrency] = useState('USD');
  const [numberFormat, setNumberFormat] = useState('14,850.00');
  const [firstDayOfWeek, setFirstDayOfWeek] = useState('Lunes');

  // Estados para restablecer datos
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [deleteAccounts, setDeleteAccounts] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const CONFIRM_WORD = 'RESTABLECER';

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await financeService.getProfile();
        if (data) {
          setProfile(data);
          setCurrency(data.currency || 'USD');
          setNumberFormat(data.number_format || '14,850.00');
          setFirstDayOfWeek(data.first_day_of_week === 'sunday' ? 'Domingo' : 'Lunes');
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

  // Restablecer datos en Supabase a 0
  const handleResetAllData = async () => {
    if (confirmationText.trim().toUpperCase() !== CONFIRM_WORD) {
      setResetError(`Escribe "${CONFIRM_WORD}" para confirmar.`);
      return;
    }

    try {
      setIsResetting(true);
      setResetError(null);

      await financeService.resetUserData({ deleteAccounts });

      setIsResetModalOpen(false);
      setStatusMessage('Datos restablecidos a cero correctamente');

      // Recarga limpia de la aplicación para sincronizar todas las vistas
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: unknown) {
      console.error('Error al restablecer datos:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al restablecer datos.';
      setResetError(msg);
    } finally {
      setIsResetting(false);
    }
  };

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
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
        <div className="w-6 h-6 border-2 border-ink/20 border-t-ink rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full bg-canvas text-ink relative min-h-screen">
      {/* Header Fijo con botón Listo */}
      <header className="sticky top-0 w-full z-30 bg-canvas/90 backdrop-blur-xl border-b border-ink/[0.04]">
        <div className="h-16 px-5 flex items-center justify-between w-full">
          <h1 className="text-[24px] font-bold text-ink tracking-tight">Ajustes</h1>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-surface border border-ink/10 text-xs font-semibold text-ink shadow-sm active:scale-95 transition-transform hover:bg-surface-muted cursor-pointer"
          >
            Listo
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 px-5 pt-4 pb-20 space-y-5">
        {statusMessage && (
          <div className="p-2.5 bg-accent-soft text-accent rounded-xl text-xs font-medium text-center border border-accent/15">
            {statusMessage}
          </div>
        )}

        {/* Tarjeta de Perfil Hero */}
        <section className="bg-surface rounded-2xl p-4 shadow-sm border border-ink/[0.05] flex items-center space-x-3.5">
          <div className="w-[52px] h-[52px] rounded-full bg-surface-muted border border-ink/5 flex items-center justify-center text-ink font-semibold text-base tracking-tight flex-shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-semibold text-ink truncate tracking-tight">{userName}</h2>
            <p className="text-[12px] text-muted truncate">{user?.email}</p>
          </div>
        </section>

        {/* Sección: Apariencia */}
        <section className="space-y-1.5">
          <h3 className="px-2 text-xs font-medium text-muted">Apariencia</h3>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((option) => {
              const isActive = theme === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-label={`Tema ${option.label}`}
                  aria-pressed={isActive}
                  title={option.description}
                  onClick={() => setTheme(option.id)}
                  className={`rounded-2xl border p-2.5 text-left transition active:scale-[0.98] cursor-pointer ${
                    isActive
                      ? 'border-ink/25 bg-surface shadow-sm'
                      : 'border-ink/10 bg-surface hover:bg-surface-muted'
                  }`}
                >
                  <span
                    className="flex h-10 items-end gap-1 rounded-xl border border-ink/10 p-1.5"
                    style={{ backgroundColor: option.preview.canvas }}
                    aria-hidden="true"
                  >
                    <span
                      className="h-full flex-1 rounded-md"
                      style={{ backgroundColor: option.preview.surface }}
                    />
                    <span
                      className="h-2/3 w-2 rounded-full"
                      style={{ backgroundColor: option.preview.accent }}
                    />
                    <span
                      className="h-2/3 w-2 rounded-full"
                      style={{ backgroundColor: option.preview.ink }}
                    />
                  </span>
                  <span className="mt-2 flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-ink leading-tight">
                      {option.label}
                    </span>
                    {isActive && (
                      <span
                        className="material-symbols-outlined text-[14px] text-accent"
                        aria-hidden="true"
                      >
                        check
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Sección 1: Preferencias Generales */}
        <section className="space-y-1.5">
          <h3 className="px-2 text-xs font-medium text-muted">Preferencias</h3>
          <div className="bg-surface rounded-2xl border border-ink/[0.05] divide-y divide-ink/[0.05] shadow-sm overflow-hidden text-xs">
            {/* Moneda Principal */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-lg bg-surface-muted text-ink flex items-center justify-center">
                  <span className="material-symbols-outlined text-[17px]">payments</span>
                </div>
                <span className="text-[13px] font-medium text-ink">Moneda Principal</span>
              </div>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  handleSavePreference({ currency: e.target.value });
                }}
                className="bg-transparent text-[13px] font-medium text-muted outline-none cursor-pointer text-right"
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
                <div className="w-7 h-7 rounded-lg bg-surface-muted text-ink flex items-center justify-center">
                  <span className="material-symbols-outlined text-[17px]">tag</span>
                </div>
                <span className="text-[13px] font-medium text-ink">Formato de decimales</span>
              </div>
              <select
                value={numberFormat}
                onChange={(e) => {
                  setNumberFormat(e.target.value);
                  handleSavePreference({ number_format: e.target.value });
                }}
                className="bg-transparent text-[13px] font-medium text-muted outline-none cursor-pointer text-right"
              >
                <option value="14,850.00">14,850.00</option>
                <option value="14.850,00">14.850,00</option>
              </select>
            </div>

            {/* Primer día de la semana */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-lg bg-surface-muted text-ink flex items-center justify-center">
                  <span className="material-symbols-outlined text-[17px]">calendar_today</span>
                </div>
                <span className="text-[13px] font-medium text-ink">Inicio de semana</span>
              </div>
              <select
                value={firstDayOfWeek}
                onChange={(e) => {
                  setFirstDayOfWeek(e.target.value);
                  handleSavePreference({ first_day_of_week: e.target.value === 'Domingo' ? 'sunday' : 'monday' });
                }}
                className="bg-transparent text-[13px] font-medium text-muted outline-none cursor-pointer text-right"
              >
                <option value="Lunes">Lunes</option>
                <option value="Domingo">Domingo</option>
              </select>
            </div>
          </div>
        </section>

        {/* Sección 2: Datos y Respaldo */}
        <section className="space-y-1.5">
          <h3 className="px-2 text-xs font-medium text-muted">Datos y respaldo</h3>
          <div className="bg-surface rounded-2xl border border-ink/[0.05] divide-y divide-ink/[0.05] shadow-sm overflow-hidden text-xs">
            {/* Exportar movimientos a CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-surface-muted active:bg-ink/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-lg bg-surface-muted text-ink flex items-center justify-center">
                  <span className="material-symbols-outlined text-[17px]">ios_share</span>
                </div>
                <div>
                  <span className="text-[13px] font-medium text-ink block">Exportar movimientos (CSV)</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-subtle">
                {isExporting ? 'hourglass_empty' : 'download'}
              </span>
            </button>

            {/* Restablecer datos a cero */}
            <button
              type="button"
              onClick={() => {
                setConfirmationText('');
                setResetError(null);
                setIsResetModalOpen(true);
              }}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-surface-muted active:bg-ink/5 transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-lg bg-expense-soft text-expense flex items-center justify-center">
                  <span className="material-symbols-outlined text-[17px]">restart_alt</span>
                </div>
                <div>
                  <span className="text-[13px] font-medium text-expense block">Restablecer datos</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-subtle group-hover:text-expense transition-colors">
                chevron_right
              </span>
            </button>
          </div>
        </section>

        {/* Sección 4: Sesión */}
        <section className="pt-2">
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full h-11 bg-expense-soft hover:bg-expense-soft-strong border border-expense/15 rounded-2xl text-xs font-semibold text-expense flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Cerrar Sesión</span>
          </button>
        </section>
      </main>

      {/* Modal de Confirmación para Restablecer (Estética Serene Finance) */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-ink/[0.06] space-y-4 animate-in zoom-in-95 duration-200">
            {/* Icono y Encabezado */}
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-expense-soft text-expense flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-outlined text-[24px]">restart_alt</span>
              </div>
              <h3 className="text-[18px] font-bold text-ink tracking-tight">
                Restablecer datos
              </h3>
              <p className="text-[12px] text-muted leading-relaxed">
                Se eliminarán tus transacciones, transferencias y deudas. Tus cuentas quedarán en <strong>$0.00</strong>.
              </p>
            </div>

            {/* Selector de Cuentas */}
            <div className="p-3 bg-canvas rounded-2xl border border-ink/[0.05]">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deleteAccounts}
                  onChange={(e) => setDeleteAccounts(e.target.checked)}
                  disabled={isResetting}
                  className="mt-0.5 w-4 h-4 rounded text-ink accent-ink cursor-pointer"
                />
                <div className="text-[11px] leading-tight">
                  <span className="font-semibold text-ink block">Eliminar también mis cuentas</span>
                  <span className="text-muted mt-0.5 block">
                    Conserva tus cuentas con saldo en $0.00.
                  </span>
                </div>
              </label>
            </div>

            {/* Input de confirmación */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted text-center">
                Escribe <span className="text-expense font-bold">{CONFIRM_WORD}</span>
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={CONFIRM_WORD}
                disabled={isResetting}
                className="w-full h-11 px-3 bg-canvas border border-ink/10 rounded-xl text-center text-sm font-semibold tracking-widest text-ink placeholder:text-subtle outline-none focus:border-ink/30 transition"
              />
            </div>

            {/* Mensaje de error si ocurre */}
            {resetError && (
              <div className="p-2.5 bg-expense-soft text-expense border border-expense/15 rounded-xl text-xs text-center font-medium">
                {resetError}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (!isResetting) {
                    setIsResetModalOpen(false);
                    setConfirmationText('');
                    setResetError(null);
                  }
                }}
                disabled={isResetting}
                className="flex-1 h-11 bg-surface-muted hover:bg-surface-muted rounded-2xl text-xs font-semibold text-ink transition active:scale-[0.98] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetAllData}
                disabled={isResetting || confirmationText.trim().toUpperCase() !== CONFIRM_WORD}
                className="flex-1 h-11 bg-expense-solid hover:bg-expense-strong disabled:opacity-40 rounded-2xl text-xs font-semibold text-canvas flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-sm"
              >
                {isResetting ? (
                  <div className="w-4 h-4 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin" />
                ) : (
                  <span>Restablecer</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};