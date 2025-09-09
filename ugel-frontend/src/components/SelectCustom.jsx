import React, { useState, useRef, useEffect, useCallback } from 'react';
import Select from 'react-select';

const SelectCustom = ({
  options = [],
  value,
  onChange,
  placeholder = "Seleccionar...",
  isClearable = false,
  isSearchable = true,
  isDisabled = false,
  isLoading = false,
  className = "",
  name,
  error = false,
  label,
  required = false,
  menuWidth = 'auto',
  noOptionsMessage = "No se encontraron resultados",
  keepFocusOnSelect = true, // nueva prop: si true, fuerza foco al seleccionar
  ...props
}) => {
  const wrapperRef = useRef(null);
  const reactSelectRef = useRef(null); // ref al componente react-select
  const [menuPlacement, setMenuPlacement] = useState('auto');
  const [calculatedMenuWidth, setCalculatedMenuWidth] = useState(menuWidth);
  const [menuPosition, setMenuPosition] = useState('left');

  // --- Helper que enfoca el input y pone el caret AL FINAL ---
  const focusInputAndSetCaretEnd = useCallback((forceFocus = true) => {
    if (!isSearchable) return;

    try {
      if (reactSelectRef.current && typeof reactSelectRef.current.focus === 'function' && forceFocus) {
        reactSelectRef.current.focus(); // hace focus en el input interno
      }
    } catch (e) {
      // ignore
    }

    const input = wrapperRef.current?.querySelector('input[type="text"], input');
    if (!input) return;
    try {
      setTimeout(() => {
        try {
          // calculamos longitud real del valor visible (si react-select usa input.value o attribute)
          const len = (input.value && input.value.length) || ((input.getAttribute && input.getAttribute('value')) || '').length || 0;
          if (typeof input.setSelectionRange === 'function') {
            input.setSelectionRange(len, len);
          } else {
            input.selectionStart = input.selectionEnd = len;
          }
          // también intentamos desplazar scroll del input para mostrar el final del texto
          if (typeof input.scrollLeft !== 'undefined') {
            input.scrollLeft = input.scrollWidth;
          }
        } catch (e) {
          try {
            input.selectionStart = input.selectionEnd = input.value.length;
          } catch (_e) {}
        }
      }, 0);
    } catch (e) {}
  }, [isSearchable]);

  // --- cálculo de ancho/posición (tu lógica, reduje repetición) ---
  const calculateMenuWidth = useCallback(() => {
    if (menuWidth !== 'auto') return menuWidth;
    if (!wrapperRef.current) return '250px';
    const selectElement = wrapperRef.current.querySelector('.react-select__control');
    if (!selectElement) return '250px';
    const rect = selectElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const controlWidth = rect.width;

    const tempElement = document.createElement('div');
    tempElement.style.position = 'absolute';
    tempElement.style.visibility = 'hidden';
    tempElement.style.whiteSpace = 'nowrap';
    tempElement.style.fontSize = '14px';
    tempElement.style.fontFamily = 'inherit';
    document.body.appendChild(tempElement);

    let maxTextWidth = 250;
    options.forEach(option => {
      if (option.label) {
        tempElement.textContent = option.label;
        const textWidth = tempElement.offsetWidth;
        maxTextWidth = Math.max(maxTextWidth, textWidth + 40);
      }
    });
    document.body.removeChild(tempElement);

    const spaceRight = viewportWidth - rect.right;
    const spaceLeft = rect.left;

    if (spaceRight >= Math.max(controlWidth, maxTextWidth)) {
      return Math.max(controlWidth, maxTextWidth) + 'px';
    }
    if (spaceLeft >= controlWidth) {
      return controlWidth + 'px';
    }
    return Math.min(maxTextWidth, 450) + 'px';
  }, [menuWidth, options]);

  const calculateMenuHorizontalPosition = useCallback(() => {
    if (!wrapperRef.current) return 'left';
    const selectElement = wrapperRef.current.querySelector('.react-select__control');
    if (!selectElement) return 'left';
    const rect = selectElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const neededWidth = parseInt(calculatedMenuWidth, 10) || 200;
    const spaceRight = viewportWidth - rect.right;
    const spaceLeft = rect.left;
    if (spaceRight >= neededWidth) return 'left';
    if (spaceLeft >= neededWidth) return 'right';
    return spaceRight > spaceLeft ? 'left' : 'right';
  }, [calculatedMenuWidth]);

  const calculateMenuPlacement = useCallback(() => {
    if (!wrapperRef.current) return 'auto';
    const selectElement = wrapperRef.current.querySelector('.react-select__control');
    if (!selectElement) return 'auto';
    const rect = selectElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const menuHeight = 200;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow >= menuHeight) return 'bottom';
    if (spaceAbove >= menuHeight) return 'top';
    return spaceBelow > spaceAbove ? 'bottom' : 'top';
  }, []);

  // --- listeners para scroll/resize ---
  useEffect(() => {
    const updatePlacement = () => setMenuPlacement(calculateMenuPlacement());
    const updateMenuWidth = () => setCalculatedMenuWidth(calculateMenuWidth());
    const updateMenuPosition = () => setMenuPosition(calculateMenuHorizontalPosition());
    updatePlacement();
    updateMenuWidth();
    updateMenuPosition();

    const handleScroll = () => {
      updatePlacement();
      updateMenuPosition();
    };
    const handleResize = () => {
      updatePlacement();
      updateMenuWidth();
      updateMenuPosition();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [options, menuWidth, calculateMenuPlacement, calculateMenuWidth, calculateMenuHorizontalPosition]);

  // --- Cuando cambie el value desde fuera, también queremos mostrar caret al FINAL (opcional) ---
  useEffect(() => {
    if (!keepFocusOnSelect) return;
    const t = setTimeout(() => {
      focusInputAndSetCaretEnd(true);
    }, 0);
    return () => clearTimeout(t);
  }, [value, focusInputAndSetCaretEnd, keepFocusOnSelect]);

  // --- onFocus: deja caret al FINAL ---
  const handleFocus = () => {
    setTimeout(() => focusInputAndSetCaretEnd(false), 10);
  };

  // --- wrapper del onChange: forzamos foco y caret al FINAL luego de seleccionar ---
  const handleChange = (selected, actionMeta) => {
    if (typeof onChange === 'function') onChange(selected, actionMeta);

    if (!keepFocusOnSelect) return;
    setTimeout(() => {
      focusInputAndSetCaretEnd(true);
    }, 0);
  };

  // --- estilos: soluciones adicionales para evitar que el caret baje a 2a linea ---
  // - flexWrap: 'nowrap' en valueContainer
  // - singleValue se oculta cuando el input tiene contenido (input visible al enfocar)
  // - input tiene minWidth pequeño y alignSelf:'center', se fuerza scrollLeft para mostrar final
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '40px',
      height: '40px',
      border: error
        ? '1px solid #ef4444'
        : state.isFocused
          ? '1px solid #2563eb'
          : '1px solid #d1d5db',
      borderRadius: '6px',
      boxShadow: state.isFocused
        ? '0 0 0 3px rgba(37, 99, 235, 0.1)'
        : 'none',
      backgroundColor: isDisabled ? '#f9fafb' : '#ffffff',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      overflow: 'hidden'
    }),
    // valueContainer: NO wrap, allow children to shrink
    valueContainer: (provided) => ({
      ...provided,
      padding: '0 12px',
      fontSize: '14px',
      height: '38px',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      flexWrap: 'nowrap',
      minWidth: 0
    }),
    // singleValue: truncates, y se oculta si el input tiene contenido (evita doble linea con caret)
    singleValue: (provided, state) => ({
      ...provided,
      color: state.selectProps.menuIsOpen ? '#9ca3af' : '#111827',
      fontSize: '14px',
      opacity: state.selectProps.menuIsOpen ? 0.6 : 1,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      flex: '0 1 auto',
      minWidth: 0,
      maxWidth: '100%',
      paddingRight: '6px',
      alignSelf: 'center',
      // hide when user is typing so the input shows the caret on single line
      visibility: state.selectProps.inputValue ? 'hidden' : 'visible'
    }),
    // input: small minWidth, centered vertically, allow it to take remaining space
    input: (provided) => ({
      ...provided,
      margin: '0',
      padding: '0',
      fontSize: '14px',
      flex: '1 1 auto',
      minWidth: 2,
      width: 'auto',
      alignSelf: 'center',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 2,
      lineHeight: '20px'
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#9ca3af',
      fontSize: '14px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }),

    /* resto de estilos (sin cambios relevantes) */
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: '#e5e7eb',
      borderRadius: '6px'
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: '#374151',
      fontSize: '14px',
      padding: '2px 6px'
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: '#6b7280',
      '&:hover': {
        backgroundColor: '#d1d5db',
        color: '#374151'
      }
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: '#d1d5db'
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      color: '#6b7280',
      padding: '8px',
      '&:hover': {
        color: '#374151'
      }
    }),
    clearIndicator: (provided) => ({
      ...provided,
      color: '#6b7280',
      padding: '8px',
      '&:hover': {
        color: '#374151'
      }
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      zIndex: 2147483647, // very high z-index to avoid click-through
      minWidth: '250px',
      width: calculatedMenuWidth,
      maxWidth: '450px',
      pointerEvents: 'auto',
      ...(menuPosition === 'right' && {
        right: 0,
        left: 'auto'
      })
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 2147483647 // ensure portal container is on top
    }),
    menuList: (provided) => ({
      ...provided,
      padding: '4px',
      borderRadius: '8px'
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? '#2563eb'
        : state.isFocused
          ? '#f3f4f6'
          : 'transparent',
      color: state.isSelected
        ? '#ffffff'
        : '#374151',
      fontSize: '14px',
      padding: '8px 12px',
      borderRadius: '6px',
      margin: '2px 0',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: state.isSelected
          ? '#2563eb'
          : '#f3f4f6'
      }
    }),
    noOptionsMessage: (provided) => ({
      ...provided,
      color: '#6b7280',
      fontSize: '14px',
      padding: '16px 12px',
      textAlign: 'center',
      fontStyle: 'italic'
    }),
    loadingMessage: (provided) => ({
      ...provided,
      color: '#6b7280',
      fontSize: '14px',
      padding: '12px'
    })
  };

  return (
    <div className={`w-full ${className}`} ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <Select
        ref={reactSelectRef}
        name={name}
        value={value}
        onChange={handleChange}
        options={options}
        placeholder={placeholder}
        isClearable={isClearable}
        isSearchable={isSearchable}
        isDisabled={isDisabled}
        isLoading={isLoading}
        styles={customStyles}
        className="react-select-container"
        classNamePrefix="react-select"
        menuPlacement={menuPlacement}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        onFocus={handleFocus}
        onMenuOpen={() => focusInputAndSetCaretEnd(false)}
        noOptionsMessage={() => noOptionsMessage}
        {...props}
      />

      {error && (
        <p className="mt-1 text-sm text-red-600">
          {typeof error === 'string' ? error : 'Este campo es requerido'}
        </p>
      )}
    </div>
  );
};

export default SelectCustom;
