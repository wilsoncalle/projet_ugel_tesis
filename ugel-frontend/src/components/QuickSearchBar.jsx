import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, UserIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const QuickSearchBar = ({
  data = [],
  activeTab,
  onSelect,
  placeholder = 'Buscar...',
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Filtrar datos según el término de búsqueda
  const filteredData = searchTerm.trim() === '' 
    ? [] 
    : data.filter(item => {
        // Normalizar búsqueda para visitantes
        if (activeTab === 'activos') {
          const nombres = `${item.visitante_nombres || item.nombres || ''} ${item.visitante_apellidos || item.apellidos || ''}`.trim().toLowerCase();
          const documento = (item.numero_documento || '').toLowerCase();
          const empleado = `${item.personal_nombres || ''} ${item.personal_apellidos || ''}`.trim().toLowerCase();
          const search = searchTerm.toLowerCase();
          
          return nombres.includes(search) || 
                 documento.includes(search) || 
                 empleado.includes(search);
        } 
        // Normalizar búsqueda para personal
        else if (activeTab === 'hoy') {
          const nombres = `${item.personal_nombres || item.nombres || ''} ${item.personal_apellidos || item.apellidos || ''}`.trim().toLowerCase();
          const documento = (item.personal_numero_documento || item.numero_documento || '').toLowerCase();
          const cargo = (item.personal_cargo_nombre || item.cargo_nombre || item.cargo || '').toLowerCase();
          const search = searchTerm.toLowerCase();
          
          return nombres.includes(search) || 
                 documento.includes(search) || 
                 cargo.includes(search);
        }
        return false;
      }).slice(0, 10); // Limitar a 10 resultados

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Manejar cambios en el input
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(value.trim().length > 0);
    setSelectedIndex(-1);
  };

  // Manejar teclas
  const handleKeyDown = (e) => {
    if (!showSuggestions && filteredData.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredData.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredData[selectedIndex]) {
          handleRegistrarSalida(e, filteredData[selectedIndex]);
        } else if (filteredData.length === 1) {
          handleRegistrarSalida(e, filteredData[0]);
        } else if (filteredData.length > 0) {
          handleRegistrarSalida(e, filteredData[0]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSearchTerm('');
        break;
    }
  };

  // Manejar registro de salida desde el botón
  const handleRegistrarSalida = (e, item) => {
    e.stopPropagation(); // Prevenir que se active el onClick del contenedor
    if (onSelect && item) {
      setShowSuggestions(false);
      setSearchTerm('');
      inputRef.current?.blur();
      onSelect(item);
    }
  };

  // Limpiar búsqueda
  const handleClear = () => {
    setSearchTerm('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Formatear nombre para mostrar
  const formatItemName = (item) => {
    if (activeTab === 'activos') {
      const nombres = `${item.visitante_nombres || item.nombres || ''} ${item.visitante_apellidos || item.apellidos || ''}`.trim();
      const documento = item.numero_documento || '';
      return { nombre: nombres, documento };
    } else if (activeTab === 'hoy') {
      const nombres = `${item.personal_nombres || item.nombres || ''} ${item.personal_apellidos || item.apellidos || ''}`.trim();
      const documento = item.personal_numero_documento || item.numero_documento || '';
      return { nombre: nombres, documento };
    }
    return { nombre: '', documento: '' };
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Barra de búsqueda en forma de píldora */}
      <div className="relative">
        <div className="flex items-center bg-white border-2 border-gray-200 rounded-full px-4 py-2 shadow-sm hover:border-gray-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 transition-all duration-200">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => searchTerm.trim().length > 0 && setShowSuggestions(true)}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
          />
          {searchTerm && (
            <button
              onClick={handleClear}
              className="ml-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Lista de sugerencias - Más ancha que el input */}
        <AnimatePresence>
          {showSuggestions && filteredData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 max-h-80 overflow-y-auto right-0"
              style={{ 
                width: 'max(500px, calc(100% + 200px))', // Más ancha que el input para nombres largos
                minWidth: '500px'
              }}
            >
              {filteredData.map((item, index) => {
                const { nombre, documento } = formatItemName(item);
                return (
                  <div
                    key={`${item.id || index}-${activeTab}`}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${
                      selectedIndex === index ? 'bg-gray-50' : ''
                    } ${index !== filteredData.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    {/* Información del visitante/personal */}
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-primary-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 break-words">
                          {nombre || 'Sin nombre'}
                        </div>
                        <div className="text-xs text-gray-500 break-words">
                          {activeTab === 'activos' 
                            ? `${documento} • ${item.personal_nombres || ''} ${item.personal_apellidos || ''}`.trim()
                            : `${documento}${item.personal_cargo_nombre || item.cargo_nombre || item.cargo ? ` • ${item.personal_cargo_nombre || item.cargo_nombre || item.cargo}` : ''}`.trim()
                          }
                        </div>
                      </div>
                    </div>
                    
                    {/* Botón de registrar salida */}
                    <div className="flex-shrink-0 ml-3">
                      <button
                        onClick={(e) => handleRegistrarSalida(e, item)}
                        className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors shadow-sm hover:shadow-md"
                        title="Registrar Salida"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuickSearchBar;

