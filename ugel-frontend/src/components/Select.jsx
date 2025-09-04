import { forwardRef, useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';

const Select = forwardRef(
  (
    {
      label,
      options = [],
      placeholder = "Seleccionar...",
      searchPlaceholder = "Buscar...",
      error,
      helpText,
      className = '',
      isSearchable = false,
      isLoading = false,
      value,
      onChange,
      onSelect,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const selectRef = useRef(null);
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    // Filter options based on search term
    const filteredOptions = options.filter(option => {
      const label = typeof option === 'object' ? option.label : option;
      return label.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Get selected option label
    const getSelectedLabel = () => {
      if (!value) return placeholder;
      const selected = options.find(option => 
        typeof option === 'object' ? option.value === value : option === value
      );
      return selected ? (typeof selected === 'object' ? selected.label : selected) : placeholder;
    };

    // Handle option selection
    const handleSelect = (option) => {
      const optionValue = typeof option === 'object' ? option.value : option;
      if (onChange) {
        onChange({ target: { value: optionValue } });
      }
      if (onSelect) {
        onSelect(option);
      }
      setIsOpen(false);
      setSearchTerm('');
      setSelectedIndex(-1);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setIsOpen(true);
          setSelectedIndex(0);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
            handleSelect(filteredOptions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearchTerm('');
          setSelectedIndex(-1);
          break;
      }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (selectRef.current && !selectRef.current.contains(event.target)) {
          setIsOpen(false);
          setSearchTerm('');
          setSelectedIndex(-1);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && isSearchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, isSearchable]);

    // Standard Select (non-searchable)
    if (!isSearchable) {
      const baseClasses = 'block w-full h-10 px-3 py-2 bg-input-background border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-sm transition-colors';
      const errorClasses = error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '';
      const loadingClasses = isLoading ? 'cursor-wait' : '';
      
      const classes = `${baseClasses} ${errorClasses} ${loadingClasses} ${className}`;

      return (
        <div className="space-y-1">
          {label && (
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {label}
            </label>
          )}
          
          <div className="relative">
            <select
              ref={ref}
              className={`${classes} appearance-none pr-8`}
              disabled={isLoading}
              value={value}
              onChange={onChange}
              {...props}
            >
              <option value="" disabled>
                {isLoading ? "Cargando..." : placeholder}
              </option>
              {options.map((option) => (
                <option
                  key={typeof option === 'object' ? option.value : option}
                  value={typeof option === 'object' ? option.value : option}
                >
                  {typeof option === 'object' ? option.label : option}
                </option>
              ))}
            </select>
            
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-between pr-2">
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          
          {helpText && !error && (
            <p className="text-sm text-gray-500">{helpText}</p>
          )}
        </div>
      );
    }

    // Searchable Select (AWS-style)
    const triggerClasses = `
      w-full h-10 px-3 py-2 bg-input-background border rounded-md shadow-sm text-left cursor-pointer flex items-center justify-between
      focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500
      ${error ? 'border-red-300' : 'border-gray-300'}
      ${isLoading ? 'cursor-wait' : ''}
      ${className}
    `;

    return (
                             <div className="space-y-1">
           {label && (
             <label className="block text-sm font-medium text-gray-700 mb-3">
               {label}
             </label>
           )}
           
           <div className="relative" ref={selectRef}>
          {/* Trigger */}
          <button
            type="button"
            className={triggerClasses}
            onClick={() => !isLoading && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span className="block truncate text-sm">
              {isLoading ? "Cargando..." : getSelectedLabel()}
            </span>
            <ChevronDownIcon 
              className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
              {/* Search Input */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-colors"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSelectedIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>

              {/* Options List */}
              <div className="max-h-48 overflow-auto py-1" ref={dropdownRef}>
                {filteredOptions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    No se encontraron resultados
                  </div>
                ) : (
                  filteredOptions.map((option, index) => {
                    const optionValue = typeof option === 'object' ? option.value : option;
                    const optionLabel = typeof option === 'object' ? option.label : option;
                    const isSelected = optionValue === value;
                    const isHighlighted = index === selectedIndex;

                    return (
                      <button
                        key={optionValue}
                        type="button"
                        className={`
                          w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors
                          ${isHighlighted ? 'bg-primary-50 text-primary-900' : 'text-gray-900'}
                          ${isSelected ? 'font-medium bg-primary-50' : 'font-normal'}
                          hover:bg-primary-50 hover:text-primary-900
                          focus:outline-none focus:bg-primary-50 focus:text-primary-900
                        `}
                        onClick={() => handleSelect(option)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <span className="truncate">{optionLabel}</span>
                        {isSelected && (
                          <CheckIcon className="h-4 w-4 text-primary-600 flex-shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        
        {helpText && !error && (
          <p className="text-sm text-gray-500">{helpText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
