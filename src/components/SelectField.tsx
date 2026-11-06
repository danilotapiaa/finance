import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}

interface MenuPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = 'Seleccionar...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedOption = options.find((option) => option.value === value);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const optionId = (index: number) => `${listId}-option-${index}`;

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(Math.max(rect.width, 240), window.innerWidth - margin * 2);
    const left = Math.min(
      Math.max(margin, rect.right - width),
      window.innerWidth - width - margin
    );
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(240, Math.max(120, openUp ? spaceAbove : spaceBelow));

    setPosition({
      left,
      width,
      maxHeight,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    });
  };

  const closeMenu = (restoreFocus = true) => {
    setIsOpen(false);
    setActiveIndex(-1);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const openMenu = (index?: number) => {
    updatePosition();
    setActiveIndex(index ?? (selectedIndex >= 0 ? selectedIndex : 0));
    setIsOpen(true);
  };

  const chooseOption = (nextValue: string) => {
    onChange(nextValue);
    closeMenu();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
      setActiveIndex(-1);
    };

    const handleReposition = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      updatePosition();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        event.preventDefault();
        openMenu(event.key === 'ArrowUp' ? options.length - 1 : undefined);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeMenu();
        break;
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0 && options[activeIndex]) {
          chooseOption(options[activeIndex].value);
        }
        break;
      case 'Tab':
        closeMenu(false);
        break;
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={
          isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined
        }
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        className={`flex items-center justify-end gap-1 min-w-0 max-w-[220px] bg-transparent font-semibold cursor-pointer outline-none text-xs text-ink ${className}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span
          className={`material-symbols-outlined text-[18px] text-subtle shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            className="fixed z-[60] overflow-y-auto rounded-2xl border border-ink/10 bg-surface p-1.5 shadow-2xl shadow-ink/20"
            style={
              position
                ? {
                    top: position.top,
                    bottom: position.bottom,
                    left: position.left,
                    width: position.width,
                    maxHeight: position.maxHeight,
                  }
                : { display: 'none' }
            }
          >
            {options.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-muted">
                Sin opciones disponibles
              </p>
            ) : (
              options.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;

                return (
                  <button
                    key={option.value}
                    id={optionId(index)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(index)}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => chooseOption(option.value)}
                    className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors cursor-pointer ${
                      isActive ? 'bg-ink text-canvas' : 'text-ink'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    <span
                      className={`material-symbols-outlined text-[16px] shrink-0 ${
                        isSelected ? '' : 'opacity-0'
                      }`}
                    >
                      check
                    </span>
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
    </>
  );
};
