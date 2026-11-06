import React, { useState } from 'react';
import { financeService } from '../services/financeService';
import { toMaterialIcon } from '../lib/icons';
import type { Category, CategoryType } from '../types/database';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  categoryToEdit?: Category | null;
}

const ICON_OPTIONS = [
  { icon: 'restaurant', label: 'Comida' },
  { icon: 'shopping_bag', label: 'Compras' },
  { icon: 'school', label: 'Educación' },
  { icon: 'movie', label: 'Entretenimiento' },
  { icon: 'health_and_safety', label: 'Salud' },
  { icon: 'bolt', label: 'Servicios' },
  { icon: 'home', label: 'Hogar' },
  { icon: 'directions_car', label: 'Transporte' },
  { icon: 'flight', label: 'Viajes' },
  { icon: 'pets', label: 'Mascotas' },
  { icon: 'fitness_center', label: 'Deporte' },
  { icon: 'savings', label: 'Ahorro' },
  { icon: 'payments', label: 'Pagos' },
  { icon: 'subscriptions', label: 'Suscripciones' },
  { icon: 'checkroom', label: 'Ropa' },
  { icon: 'local_cafe', label: 'Café' },
  { icon: 'sports_esports', label: 'Juegos' },
  { icon: 'phone_iphone', label: 'Tecnología' },
  { icon: 'medical_services', label: 'Médico' },
  { icon: 'celebration', label: 'Celebración' },
  { icon: 'work', label: 'Trabajo' },
  { icon: 'trending_up', label: 'Inversiones' },
  { icon: 'card_giftcard', label: 'Regalos' },
  { icon: 'category', label: 'General' },
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  categoryToEdit = null,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [icon, setIcon] = useState('category');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean | null>(null);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);

    if (isOpen) {
      setName(categoryToEdit?.name ?? '');
      setType(categoryToEdit?.type ?? 'expense');
      setIcon(categoryToEdit ? toMaterialIcon(categoryToEdit.icon) : 'category');
      setErrorMessage(null);
      setIsSaving(false);
    }
  }

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMessage('Escribe un nombre para la categoría');
      return;
    }

    setIsSaving(true);

    try {
      if (categoryToEdit) {
        await financeService.updateCategory(categoryToEdit.id, {
          name: trimmedName,
          icon,
        });
      } else {
        await financeService.createCategory({
          name: trimmedName,
          type,
          icon,
        });
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('No se pudo guardar la categoría.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/35 backdrop-blur-sm pointer-events-auto">
      <div className="bg-surface rounded-t-[32px] shadow-2xl border-t border-ink/5 overflow-hidden px-5 pt-3 pb-8 flex flex-col gap-3 max-w-md mx-auto w-full max-h-[92vh] overflow-y-auto">
        <div className="w-9 h-1 bg-ink/20 rounded-full mx-auto mb-1"></div>

        <div className="flex items-center justify-between border-b border-ink/[0.04] pb-2">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-muted hover:bg-ink/10 transition active:scale-95 cursor-pointer"
            type="button"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          <h2 className="text-[15px] font-semibold text-ink">
            {categoryToEdit ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <div className="w-8"></div>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 pt-1 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1" htmlFor="category-name">
              Nombre
            </label>
            <input
              id="category-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Mascotas"
              maxLength={40}
              className="w-full h-10 px-3 bg-canvas border border-ink/[0.06] rounded-xl text-sm text-ink focus:outline-none focus:border-ink"
            />
          </div>

          {categoryToEdit ? (
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted">Tipo</span>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-semibold ${
                  type === 'expense'
                    ? 'bg-expense-soft text-expense'
                    : 'bg-accent-soft text-accent'
                }`}
              >
                {type === 'expense' ? 'Gasto' : 'Ingreso'}
              </span>
            </div>
          ) : (
            <div>
              <span className="block text-[11px] font-medium text-muted mb-1">Tipo</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`h-10 rounded-xl font-semibold transition cursor-pointer ${
                    type === 'expense'
                      ? 'bg-expense text-white'
                      : 'bg-canvas text-muted border border-ink/[0.06]'
                  }`}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`h-10 rounded-xl font-semibold transition cursor-pointer ${
                    type === 'income'
                      ? 'bg-accent text-white'
                      : 'bg-canvas text-muted border border-ink/[0.06]'
                  }`}
                >
                  Ingreso
                </button>
              </div>
            </div>
          )}

          <div>
            <span className="block text-[11px] font-medium text-muted mb-1">Ícono</span>
            <div className="grid grid-cols-6 gap-1.5">
              {ICON_OPTIONS.map((option) => {
                const isSelected = icon === option.icon;

                return (
                  <button
                    key={option.icon}
                    type="button"
                    aria-label={option.label}
                    aria-pressed={isSelected}
                    onClick={() => setIcon(option.icon)}
                    className={`h-9 rounded-xl flex items-center justify-center border transition active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-ink text-canvas border-ink'
                        : 'bg-canvas text-ink border-ink/[0.06] hover:bg-surface-muted'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {option.icon}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full h-11 bg-ink text-canvas rounded-xl text-sm font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSaving
              ? 'Guardando...'
              : categoryToEdit
                ? 'Guardar cambios'
                : 'Crear categoría'}
          </button>
        </form>
      </div>
    </div>
  );
};
