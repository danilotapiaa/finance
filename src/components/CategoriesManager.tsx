import React, { useCallback, useEffect, useState } from 'react';
import { financeService } from '../services/financeService';
import { useFeedback } from '../context/FeedbackContext';
import { toMaterialIcon } from '../lib/icons';
import { CategoryModal } from './CategoryModal';
import type { Category, CategoryType } from '../types/database';

interface CategoriesManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoriesManager: React.FC<CategoriesManagerProps> = ({
  isOpen,
  onClose,
}) => {
  const { confirm, toast } = useFeedback();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeType, setActiveType] = useState<CategoryType>('expense');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean | null>(null);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);

    if (isOpen) {
      setIsLoading(true);
      setErrorMessage(null);
    }
  }

  const loadCategories = useCallback(async () => {
    try {
      const data = await financeService.getCategories();
      setCategories(data ?? []);
    } catch {
      setErrorMessage('No se pudieron cargar las categorías.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const load = async () => {
      await loadCategories();
    };

    void load();
  }, [isOpen, loadCategories]);

  if (!isOpen) return null;

  const visibleCategories = categories.filter(
    (category) => category.type === activeType
  );

  const openNewCategory = () => {
    setCategoryToEdit(null);
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (category: Category) => {
    setCategoryToEdit(category);
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setCategoryToEdit(null);
  };

  const handleSaved = async () => {
    await loadCategories();
    toast({ message: 'Categoría guardada.' });
  };

  const handleDelete = async (category: Category) => {
    const accepted = await confirm({
      title: 'Eliminar categoría',
      message:
        'Se eliminarán los presupuestos asociados y los movimientos quedarán sin categoría. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
    });

    if (!accepted) return;

    try {
      await financeService.deleteCategory(category.id);
      await loadCategories();
      toast({ message: 'Categoría eliminada.' });
    } catch {
      toast({ message: 'No se pudo eliminar la categoría.', variant: 'error' });
    }
  };

  return (
    <>
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
            <h2 className="text-[15px] font-semibold text-ink">Categorías</h2>
            <button
              type="button"
              onClick={openNewCategory}
              className="h-8 px-3 rounded-lg bg-ink text-canvas text-[11px] font-semibold transition active:scale-95 cursor-pointer"
            >
              Nueva
            </button>
          </div>

          <p className="text-[11px] leading-relaxed text-muted">
            Estas categorías se usan en tus movimientos y en los presupuestos mensuales.
          </p>

          {errorMessage && (
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-xs text-center font-medium">
              {errorMessage}
            </div>
          )}

          <div className="bg-surface-muted p-1 rounded-full flex gap-1 items-center text-xs font-medium">
            <button
              type="button"
              aria-pressed={activeType === 'expense'}
              onClick={() => setActiveType('expense')}
              className={`flex-1 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                activeType === 'expense'
                  ? 'bg-ink text-canvas shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Gastos
            </button>
            <button
              type="button"
              aria-pressed={activeType === 'income'}
              onClick={() => setActiveType('income')}
              className={`flex-1 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                activeType === 'income'
                  ? 'bg-accent text-canvas shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Ingresos
            </button>
          </div>

          {isLoading ? (
            <p className="text-center py-6 text-xs text-subtle">Cargando...</p>
          ) : visibleCategories.length === 0 ? (
            <p className="text-center py-6 text-xs text-subtle">
              No hay categorías de {activeType === 'expense' ? 'gasto' : 'ingreso'}. Crea
              una para usarla en tus presupuestos.
            </p>
          ) : (
            <ul className="divide-y divide-ink/[0.04]">
              {visibleCategories.map((category) => (
                <li key={category.id} className="flex items-center gap-3 py-2.5">
                  <div className="w-9 h-9 rounded-xl bg-canvas flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px] text-ink">
                      {toMaterialIcon(category.icon)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink truncate">
                      {category.name}
                    </p>
                    {category.user_id === null && (
                      <p className="text-[10px] text-subtle">Predeterminada</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditCategory(category)}
                      aria-label={`Editar ${category.name}`}
                      className="w-8 h-8 rounded-lg text-muted hover:bg-surface-muted hover:text-ink transition flex items-center justify-center cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>

                    {category.user_id !== null && (
                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        aria-label={`Eliminar ${category.name}`}
                        className="w-8 h-8 rounded-lg text-muted hover:bg-red-50 hover:text-red-600 transition flex items-center justify-center cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          delete
                        </span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[10px] text-subtle leading-relaxed">
            Las categorías predeterminadas se personalizan para tu cuenta sin afectar a
            otros usuarios. Al editarlas, tus movimientos y presupuestos se trasladan a tu
            copia personal.
          </p>
        </div>
      </div>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={closeCategoryModal}
        onSaved={handleSaved}
        categoryToEdit={categoryToEdit}
      />
    </>
  );
};
