import { forwardRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const Select = forwardRef(
  (
    {
      label,
      options = [],
      placeholder = "Seleccionar...",
      error,
      helpText,
      className = '',
      isSearchable = false,
      isLoading = false,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm transition-colors';
    const errorClasses = error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '';
    const loadingClasses = isLoading ? 'cursor-wait' : '';
    
    const classes = `${baseClasses} ${errorClasses} ${loadingClasses} ${className}`;

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        
        <div className="relative">
          <select
            ref={ref}
            className={`${classes} appearance-none pr-10`}
            disabled={isLoading}
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
          
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
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
);

Select.displayName = 'Select';

export default Select;
