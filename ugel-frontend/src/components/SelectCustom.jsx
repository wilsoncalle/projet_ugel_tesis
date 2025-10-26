import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const SelectCustom = ({
  options = [],
  value,
  onChange,
  placeholder = "Seleccionar...",
  isClearable = false,
  isDisabled = false,
  isLoading = false,
  className = "",
  name,
  error = false,
  label,
  required = false,
  noOptionsMessage = "No se encontraron resultados",
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
  
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const optionRefs = useRef([]);

  const filteredOptions = useMemo(() => {
    if (!query) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [options, query]);

  const calculatePositionAndWidth = useCallback(() => {
    if (!containerRef.current) {
      return { width: '250px', openUpwards: false, alignRight: false };
    }

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // ----- CORRECCIÓN #1: ELIMINAMOS LA LÍNEA QUE CAUSABA EL ERROR 'setUsePortal' -----
    // const isInModal = container.closest('[role="dialog"]') !== null;
    // setUsePortal(isInModal); // <--- ESTA LÍNEA SE FUE

    let width = menuWidth;
    if (menuWidth === 'auto') {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = '14px system-ui, -apple-system, sans-serif';
      
      let maxTextWidth = 250;
      options.forEach(option => {
        if (option.label) {
          const textWidth = context.measureText(option.label).width;
          maxTextWidth = Math.max(maxTextWidth, textWidth + 40);
        }
      });
      width = `${Math.max(rect.width, maxTextWidth, 250)}px`;
    }

    const menuHeight = 240;
    const spaceBelow = viewportHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUpwards = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    const menuWidthNumber = parseInt(width);
    const spaceRight = viewportWidth - rect.left;
    const alignRight = spaceRight < menuWidthNumber && rect.right > menuWidthNumber;

    return { width, openUpwards, alignRight };
  }, [options, menuWidth]);

  const scrollToOption = useCallback((index) => {
    if (optionRefs.current[index]) {
      optionRefs.current[index].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, []);

  const handleOptionSelect = useCallback((option) => {
    onChange?.(option);
    setQuery('');
    setIsOpen(false);
    setIsTyping(false);
    setFocusedIndex(-1);
  }, [onChange]);

  // ----- CORRECCIÓN #2: MOVIMOS ESTAS FUNCIONES ANTES DE 'handleKeyDown' -----
  const handleInputClick = useCallback(() => {
    if (isDisabled) return;

    if (isOpen) {
      setIsOpen(false);
      setFocusedIndex(-1);
      return;
    }
    
    const { width, openUpwards, alignRight } = calculatePositionAndWidth();
    setCalculatedMenuWidth(width);
    setMenuPosition({ openUpwards, alignRight });
    setIsOpen(true);
    setIsTyping(true);
    setQuery('');
    setFocusedIndex(-1);
        
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [isDisabled, isOpen, calculatePositionAndWidth]);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        handleInputClick();
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => {
          const newIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          setTimeout(() => scrollToOption(newIndex), 0);
          return newIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          setTimeout(() => scrollToOption(newIndex), 0);
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          handleOptionSelect(filteredOptions[focusedIndex]);
        } else if (!isOpen) {
          handleInputClick();
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
  }, [isOpen, focusedIndex, filteredOptions, handleInputClick, handleOptionSelect, scrollToOption]);

  useEffect(() => {
    if (!isOpen) return;
    
    let timeoutId;
    const handleRecalculate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const { width, openUpwards, alignRight } = calculatePositionAndWidth();
        setCalculatedMenuWidth(width);
        setMenuPosition({ openUpwards, alignRight });
      }, 16);
    };

    window.addEventListener('scroll', handleRecalculate, true);
    window.addEventListener('resize', handleRecalculate);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleRecalculate, true);
      window.removeEventListener('resize', handleRecalculate);
    };
  }, [isOpen, calculatePositionAndWidth]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsTyping(false);
        setQuery('');
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && filteredOptions.length > 0 && focusedIndex >= filteredOptions.length) {
      setFocusedIndex(0);
    }
  }, [filteredOptions.length, focusedIndex, isOpen]);
  
  const handleInputChange = useCallback((e) => {
    if (!isSearchable) return;
    
    const newValue = e.target.value;
    setQuery(newValue);
    setIsTyping(true);
    setFocusedIndex(-1);

    if (!isOpen) {
      const { width, openUpwards, alignRight } = calculatePositionAndWidth();
      setCalculatedMenuWidth(width);
      setMenuPosition({ openUpwards, alignRight });
      setIsOpen(true);
    }
  }, [isOpen, calculatePositionAndWidth, isSearchable]);

  const handleOptionHover = useCallback((index) => {
    setFocusedIndex(index);
  }, []);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    onChange?.(null);
    setQuery('');
    setIsTyping(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  }, [onChange]);

  const getInputValue = useCallback(() => {
    if (isTyping) return query;
    return value ? value.label : '';
  }, [isTyping, query, value]);

  const getPlaceholder = useCallback(() => {
    if (isTyping || !value) return placeholder;
    return '';
  }, [isTyping, value, placeholder]);

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
              ${isDisabled ? 'cursor-not-allowed text-gray-500' : 'text-gray-900'}
              ${!isSearchable ? 'cursor-pointer' : ''}
            `}
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            <div className={`text-gray-400 p-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {isOpen && (
          <div
            className={`
              absolute bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto
              ${menuPosition.openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'}
              ${menuPosition.alignRight ? 'right-0' : 'left-0'}
              z-[1001]
            `}
            style={{
              width: calculatedMenuWidth,
              minWidth: '250px',
              maxWidth: '450px'
            }}
            role="listbox"
            aria-label="Opciones"
          >
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500">
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
                  ref={el => optionRefs.current[index] = el}
                  id={`option-${index}`}
                  className={`
                    px-3 py-2 text-sm cursor-pointer border-b border-gray-100 last:border-b-0
                    transition-colors duration-100
                    ${focusedIndex === index
                      ? 'bg-blue-50 text-blue-900'
                      : 'hover:bg-blue-50 hover:text-blue-900'
                    }
                    ${value?.value === option.value ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'}
                  `}
                  onClick={() => handleOptionSelect(option)}
                  onMouseEnter={() => handleOptionHover(index)}
                  role="option"
                  aria-selected={value?.value === option.value}
                >
                  <div className="flex items-center justify-between">
                    <span>{option.label}</span>
                    {value?.value === option.value && (
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {typeof error === 'string' ? error : 'Este campo es requerido'}
        </p>
      )}
    </div>
  );
};

export default SelectCustom;