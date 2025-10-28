import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Check } from 'lucide-react';

const SelectCustom = ({
  options = [],
  value,
  onChange,
  placeholder = 'Seleccionar...',
  isClearable = false,
  isDisabled = false,
  isLoading = false,
  className = '',
  name,
  error = false,
  label,
  required = false,
  noOptionsMessage = 'No se encontraron resultados',
  menuWidth = 'auto',
  isSearchable = true,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [calculatedMenuWidth, setCalculatedMenuWidth] = useState('250px');
  const [menuPosition, setMenuPosition] = useState({ openUpwards: false, alignRight: false });
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // NUEVO: guardamos el rect del ancla cuando abrimos y lo actualizamos en scroll/resize
  const [anchorRect, setAnchorRect] = useState(null);
  const [menuHeight, setMenuHeight] = useState(240); // fallback; luego medimos real
  const menuRef = useRef(null);

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const optionRefs = useRef([]);

  const filteredOptions = useMemo(() => {
    if (!query) return options;
    return options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  }, [options, query]);

  const calculatePositionAndWidth = useCallback(() => {
    if (!containerRef.current) {
      return { width: '250px', openUpwards: false, alignRight: false, rect: null };
    }
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let width = menuWidth;
    if (menuWidth === 'auto') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      let maxText = 250;
      options.forEach((opt) => {
        if (opt.label) {
          maxText = Math.max(maxText, ctx.measureText(opt.label).width + 40);
        }
      });
      width = `${Math.max(rect.width, maxText, 250)}px`;
    }

    const menuHeightGuess = Math.max(menuHeight, 240);
    const spaceBelow = viewportHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUpwards = spaceBelow < menuHeightGuess && spaceAbove > spaceBelow;

    const menuW = parseInt(width, 10);
    const spaceRight = viewportWidth - rect.left;
    const alignRight = spaceRight < menuW && rect.right > menuW;

    return { width, openUpwards, alignRight, rect };
  }, [options, menuWidth, menuHeight]);

  const scrollToOption = useCallback((index) => {
    if (optionRefs.current[index]) {
      optionRefs.current[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, []);

  const handleOptionSelect = useCallback(
    (option) => {
      onChange?.(option);
      setQuery('');
      setIsOpen(false);
      setIsTyping(false);
      setFocusedIndex(-1);
    },
    [onChange]
  );

  const openMenu = useCallback(() => {
    const { width, openUpwards, alignRight, rect } = calculatePositionAndWidth();
    setCalculatedMenuWidth(width);
    setMenuPosition({ openUpwards, alignRight });
    setAnchorRect(rect);
    setIsOpen(true);
    setIsTyping(true);
    setQuery('');
    setFocusedIndex(-1);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [calculatePositionAndWidth]);

  const handleInputClick = useCallback(() => {
    if (isDisabled) return;
    if (isOpen) {
      setIsOpen(false);
      setFocusedIndex(-1);
      return;
    }
    openMenu();
  }, [isDisabled, isOpen, openMenu]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault();
          openMenu();
          return;
        }
      }
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
            setTimeout(() => scrollToOption(next), 0);
            return next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
            setTimeout(() => scrollToOption(next), 0);
            return next;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (isOpen && focusedIndex >= 0 && filteredOptions[focusedIndex]) {
            handleOptionSelect(filteredOptions[focusedIndex]);
          } else if (!isOpen) {
            openMenu();
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setIsTyping(false);
          setQuery('');
          setFocusedIndex(-1);
          inputRef.current?.blur();
          break;
        case 'Tab':
          if (isOpen) {
            setIsOpen(false);
            setIsTyping(false);
            setQuery('');
            setFocusedIndex(-1);
          }
          break;
        default:
          break;
      }
    },
    [isOpen, filteredOptions, focusedIndex, handleOptionSelect, openMenu, scrollToOption]
  );

  // Recalcular posición mientras esté abierto
  useEffect(() => {
    if (!isOpen) return;
    let tid;
    const recalc = () => {
      clearTimeout(tid);
      tid = setTimeout(() => {
        const { width, openUpwards, alignRight, rect } = calculatePositionAndWidth();
        setCalculatedMenuWidth(width);
        setMenuPosition({ openUpwards, alignRight });
        setAnchorRect(rect);
      }, 16);
    };
    window.addEventListener('scroll', recalc, true);
    window.addEventListener('resize', recalc);
    return () => {
      clearTimeout(tid);
      window.removeEventListener('scroll', recalc, true);
      window.removeEventListener('resize', recalc);
    };
  }, [isOpen, calculatePositionAndWidth]);

  // Cerrar al click fuera
  useEffect(() => {
    const handleClickOutside = (ev) => {
      if (containerRef.current && !containerRef.current.contains(ev.target)) {
        // si el click es dentro del portal (menú), no cerrar aquí
        if (menuRef.current && menuRef.current.contains(ev.target)) return;
        setIsOpen(false);
        setIsTyping(false);
        setQuery('');
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Medir altura real del menú cuando se abre para posicionar hacia arriba con precisión
  useEffect(() => {
    if (!isOpen) return;
    // medir en el siguiente frame
    const id = requestAnimationFrame(() => {
      if (menuRef.current) {
        setMenuHeight(menuRef.current.offsetHeight || 240);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen, filteredOptions.length, isLoading]);

  const handleInputChange = useCallback(
    (e) => {
      if (!isSearchable) return;
      const newVal = e.target.value;
      setQuery(newVal);
      setIsTyping(true);
      setFocusedIndex(-1);
      if (!isOpen) openMenu();
    },
    [isOpen, isSearchable, openMenu]
  );

  const handleOptionHover = useCallback((index) => setFocusedIndex(index), []);

  const handleClear = useCallback(
    (e) => {
      e.stopPropagation();
      onChange?.(null);
      setQuery('');
      setIsTyping(false);
      setFocusedIndex(-1);
      inputRef.current?.focus();
    },
    [onChange]
  );

  const getInputValue = useCallback(() => (isTyping ? query : value ? value.label : ''), [isTyping, query, value]);
  const getPlaceholder = useCallback(() => ((isTyping || !value) ? placeholder : ''), [isTyping, value, placeholder]);

  // ======= POSICIONAMIENTO DEL PORTAL =======
  const menuLeft = (() => {
    if (!anchorRect) return 0;
    const menuW = parseInt(calculatedMenuWidth, 10);
    if (menuPosition.alignRight) {
      return Math.max(anchorRect.right - menuW, 8); // margen mínimo
    }
    return Math.max(anchorRect.left, 8);
  })();

  const menuTop = (() => {
    if (!anchorRect) return 0;
    if (menuPosition.openUpwards) {
      return Math.max(anchorRect.top - (menuHeight + 4), 8);
    }
    return Math.min(anchorRect.bottom + 4, window.innerHeight - 8);
  })();

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <div
          className={`
            relative w-full cursor-text rounded-lg border h-10 flex items-center
            transition-all duration-200
            ${error
              ? 'border-red-500 focus-within:border-red-500'
              : (isOpen || isTyping)
                ? 'border-blue-500 ring-2 ring-blue-100'
                : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100'
            }
            ${isDisabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
            ${(isOpen || isTyping) ? '' : 'hover:border-gray-400'}
          `}
          onClick={handleInputClick}
        >
          <input
            ref={inputRef}
            type="text"
            className={`
              w-full h-full px-3 pr-10 text-sm bg-transparent border-none outline-none
              font-sans
              ${isDisabled ? 'cursor-not-allowed text-gray-500' : 'text-gray-900'}
              ${!isSearchable ? 'cursor-pointer' : ''}
            `}
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
            value={getInputValue()}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={isDisabled}
            readOnly={!isSearchable}
            name={name}
            autoComplete="off"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-activedescendant={focusedIndex >= 0 ? `option-${focusedIndex}` : undefined}
            {...props}
          />

          <div className="absolute right-2 flex items-center space-x-1">
            {isClearable && value && !isDisabled && (
              <button
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors"
                type="button"
                aria-label="Limpiar selección"
                tabIndex={-1}
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className={`text-gray-400 p-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {typeof error === 'string' ? error : 'Este campo es requerido'}
        </p>
      )}

      {/* ===== PORTAL DEL MENÚ ===== */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="absolute bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto z-[1001]"
            role="listbox"
            aria-label="Opciones"
            style={{
              position: 'fixed',
              top: `${menuTop}px`,
              left: `${menuLeft}px`,
              width: calculatedMenuWidth,
              minWidth: '250px',
              maxWidth: '450px',
              pointerEvents: 'auto',
            }}
          >
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                Cargando...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 italic">
                {noOptionsMessage}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  ref={(el) => (optionRefs.current[index] = el)}
                  id={`option-${index}`}
                  onClick={() => handleOptionSelect(option)}
                  onMouseEnter={() => handleOptionHover(index)}
                  role="option"
                  aria-selected={value?.value === option.value}
                  className={`
                    px-3 py-2 text-sm cursor-pointer border-b border-gray-100 last:border-b-0
                    transition-colors duration-100
                    ${focusedIndex === index
                      ? 'bg-blue-50 text-blue-900'
                      : 'hover:bg-blue-50 hover:text-blue-900'
                    }
                    ${value?.value === option.value ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'}
                  `}
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>{option.label}</span>
                    {value?.value === option.value && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default SelectCustom;
