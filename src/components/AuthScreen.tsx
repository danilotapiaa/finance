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
    <div className="min-h-screen w-full bg-canvas text-ink flex flex-col justify-center gap-10 px-6 py-12 selection:bg-ink/15">
      {/* Cabecera / Identidad */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-ink text-canvas flex items-center justify-center mx-auto shadow-md">
          <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mt-4">Serene Finance</h1>
      </div>

      {/* Formulario Principal */}
      <div className="w-full max-w-sm mx-auto bg-surface p-6 rounded-3xl border border-ink/[0.04] shadow-sm space-y-4">
        <div className="flex bg-canvas p-1 rounded-full text-xs font-medium mb-4">
          <button
            type="button"
            onClick={() => { setIsRegistering(false); setErrorMessage(null); }}
            className={`flex-1 py-1.5 rounded-full transition-all ${
              !isRegistering ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => { setIsRegistering(true); setErrorMessage(null); }}
            className={`flex-1 py-1.5 rounded-full transition-all ${
              isRegistering ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            Registrarme
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-expense-soft border border-expense/10 rounded-xl text-xs text-expense leading-relaxed">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegistering && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Nombre completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full h-11 px-3.5 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full h-11 px-3.5 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 px-3.5 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-ink text-canvas rounded-2xl font-semibold text-sm hover:bg-ink/90 active:scale-[0.98] transition-all shadow-md shadow-black/5 flex items-center justify-center mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin"></span>
            ) : isRegistering ? (
              'Crear cuenta'
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};