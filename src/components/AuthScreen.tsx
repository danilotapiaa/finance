import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (isRegistering) {
        if (!fullName.trim()) {
          throw new Error('Por favor ingresa tu nombre completo.');
        }
        await signUp(email, password, fullName.trim());
      } else {
        await signIn(email, password);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Ocurrió un error inesperado al autenticar.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] text-[#111827] flex flex-col justify-between px-6 py-12 selection:bg-neutral-200">
      {/* Cabecera / Identidad */}
      <div className="pt-8 text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-[#111827] text-white flex items-center justify-center mx-auto shadow-md">
          <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mt-4">Serene Finance</h1>
        <p className="text-xs text-[#6B7280]">Gestión patrimonial personal simple y sin fricción</p>
      </div>

      {/* Formulario Principal */}
      <div className="w-full max-w-sm mx-auto bg-white p-6 rounded-3xl border border-black/[0.04] shadow-sm space-y-4">
        <div className="flex bg-[#F8F9FA] p-1 rounded-full text-xs font-medium mb-4">
          <button
            type="button"
            onClick={() => { setIsRegistering(false); setErrorMessage(null); }}
            className={`flex-1 py-1.5 rounded-full transition-all ${
              !isRegistering ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setIsRegistering(true); setErrorMessage(null); }}
            className={`flex-1 py-1.5 rounded-full transition-all ${
              isRegistering ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[#FDF2F0] border border-[#C25E4A]/10 rounded-xl text-xs text-[#C25E4A] leading-relaxed">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegistering && (
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alejandro González"
                className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-black/[0.06] rounded-xl text-sm text-[#111827] focus:outline-none focus:border-[#111827] transition"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-black/[0.06] rounded-xl text-sm text-[#111827] focus:outline-none focus:border-[#111827] transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 px-3.5 bg-[#F8F9FA] border border-black/[0.06] rounded-xl text-sm text-[#111827] focus:outline-none focus:border-[#111827] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#111827] text-white rounded-2xl font-semibold text-sm hover:bg-black active:scale-[0.98] transition-all shadow-md shadow-black/5 flex items-center justify-center mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : isRegistering ? (
              'Crear mi Bóveda'
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>

      {/* Pie con nota de privacidad */}
      <div className="text-center text-[11px] text-[#9CA3AF] space-y-1">
        <p>Bóveda personal cifrada punto a punto con Supabase.</p>
        <p>Tus credenciales nunca se comparten con terceros.</p>
      </div>
    </div>
  );
};