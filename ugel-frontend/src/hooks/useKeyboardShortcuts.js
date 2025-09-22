import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook personalizado para manejar atajos de teclado y enfoque inteligente
 * @param {Object} options - Opciones de configuración
 * @param {string} options.activeTab - Pestaña activa ('activos' o 'historial')
 * @param {Function} options.onSubmit - Función a ejecutar cuando se presiona Enter
 * @param {Object} options.refs - Referencias a elementos del DOM
 * @param {Object} options.refs.documentoInput - Referencia al input de número de documento
 * @param {Object} options.refs.busquedaInput - Referencia al input de búsqueda
 * @param {Object} options.refs.registroFormRef - Referencia al componente RegistroForm
 * @param {boolean} options.enabled - Si los atajos están habilitados
 */
const useKeyboardShortcuts = ({
  activeTab,
  onSubmit,
  refs = {},
  enabled = true
}) => {
  const { documentoInput, busquedaInput } = refs;
  const lastKeyPressTime = useRef(0);
  const keyBuffer = useRef('');
  const enterPressCount = useRef(0);
  const lastEnterTime = useRef(0);

  // Función para verificar si un elemento es un textarea o botón
  const isTextareaOrButton = (element) => {
    if (!element) return false;
    return element.tagName === 'TEXTAREA' || element.tagName === 'BUTTON';
  };

  // Función para verificar si el foco está en un formulario
  const isFormElementFocused = () => {
    const activeElement = document.activeElement;
    if (!activeElement || activeElement === document.body) return false;
    
    // Verificar si es un input, select, textarea o button
    return ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(activeElement.tagName);
  };

  // Función para manejar Enter como Submit
  const handleEnterSubmit = useCallback((event) => {
    if (!enabled) return;
    
    // Solo procesar si se presionó Enter
    if (event.key !== 'Enter') return;
    
    // No procesar si el foco está en textarea o botón
    if (isTextareaOrButton(event.target)) return;
    
    // Para la pestaña activos, solo procesar Enter si no hay foco en formularios
    if (activeTab === 'activos' && isFormElementFocused()) return;
    
    // Para la pestaña historial, procesar Enter normalmente
    if (activeTab === 'historial' && isFormElementFocused() && event.target.tagName !== 'INPUT') return;
    
    // Prevenir el comportamiento por defecto
    event.preventDefault();
    event.stopPropagation();
    
    const currentTime = Date.now();
    
    // Para la pestaña activos, requerir doble Enter
    if (activeTab === 'activos') {
      // Si han pasado más de 3 segundos desde el último Enter, resetear contador
      if (currentTime - lastEnterTime.current > 3000) {
        enterPressCount.current = 0;
      }
      
      enterPressCount.current++;
      lastEnterTime.current = currentTime;
      
      // Solo ejecutar después del segundo Enter
      if (enterPressCount.current === 2) {
        enterPressCount.current = 0; // Resetear contador
        if (onSubmit && typeof onSubmit === 'function') {
          onSubmit();
        }
      } else if (enterPressCount.current === 1) {
        // Mostrar indicación visual de que se necesita otro Enter
        // Esto se manejará en el componente padre
        if (onSubmit && typeof onSubmit === 'function') {
          onSubmit('first_enter');
        }
      }
    } else {
      // Para historial, comportamiento normal (un solo Enter)
      if (onSubmit && typeof onSubmit === 'function') {
        onSubmit();
      }
    }
  }, [enabled, onSubmit, activeTab]);

  // Función para manejar enfoque automático en pestaña Activos
  const handleActivosFocus = useCallback((event) => {
    if (!enabled || activeTab !== 'activos') return;
    
    // Solo procesar si no hay foco en elementos de formulario
    if (isFormElementFocused()) return;
    
    // Solo procesar teclas numéricas (0-9)
    if (!/^[0-9]$/.test(event.key)) return;
    
    // Prevenir el comportamiento por defecto
    event.preventDefault();
    event.stopPropagation();
    
    // Enfocar el input de documento y agregar el número
    if (documentoInput && documentoInput.current) {
      const input = documentoInput.current;
      input.focus();
      
      // Insertar el número al final del valor actual
      const currentValue = input.value || '';
      const newValue = currentValue + event.key;
      input.value = newValue;
      
      // Disparar evento de cambio para que React detecte el cambio
      const changeEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(changeEvent);
    }
  }, [enabled, activeTab, documentoInput]);

  // Función para manejar enfoque automático en pestaña Historial
  const handleHistorialFocus = useCallback((event) => {
    if (!enabled || activeTab !== 'historial') return;
    
    // Solo procesar si no hay foco en elementos de formulario
    if (isFormElementFocused()) return;
    
    // Solo procesar teclas alfanuméricas (letras y números)
    if (!/^[a-zA-Z0-9]$/.test(event.key)) return;
    
    // Prevenir el comportamiento por defecto
    event.preventDefault();
    event.stopPropagation();
    
    // Enfocar el input de búsqueda y agregar el carácter
    if (busquedaInput && busquedaInput.current) {
      const input = busquedaInput.current;
      input.focus();
      
      // Insertar el carácter al final del valor actual
      const currentValue = input.value || '';
      const newValue = currentValue + event.key;
      input.value = newValue;
      
      // Disparar evento de cambio para que React detecte el cambio
      const changeEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(changeEvent);
    }
  }, [enabled, activeTab, busquedaInput]);

  // Función principal para manejar eventos de teclado
  const handleKeyDown = useCallback((event) => {
    // Manejar Enter como Submit
    handleEnterSubmit(event);
    
    // Manejar enfoque automático según la pestaña activa
    if (activeTab === 'activos') {
      handleActivosFocus(event);
    } else if (activeTab === 'historial') {
      handleHistorialFocus(event);
    }
  }, [handleEnterSubmit, handleActivosFocus, handleHistorialFocus, activeTab]);

  // Efecto para agregar y remover event listeners
  useEffect(() => {
    if (!enabled) return;

    // Agregar event listener
    document.addEventListener('keydown', handleKeyDown, true);

    // Función de limpieza
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, handleKeyDown]);

  // Función para limpiar el buffer de teclas (útil para futuras funcionalidades)
  const clearKeyBuffer = useCallback(() => {
    keyBuffer.current = '';
    lastKeyPressTime.current = 0;
  }, []);

  // Función para limpiar el contador de Enter
  const clearEnterCount = useCallback(() => {
    enterPressCount.current = 0;
    lastEnterTime.current = 0;
  }, []);

  return {
    clearKeyBuffer,
    clearEnterCount
  };
};

export default useKeyboardShortcuts;
