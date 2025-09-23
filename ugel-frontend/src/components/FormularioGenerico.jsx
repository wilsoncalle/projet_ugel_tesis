import { useState, useEffect } from 'react';

const FormularioGenerico = ({
  id,
  fields = [],
  initialData = {},
  onSubmit,
  onCancel,
  onChange, // Nuevo prop para notificar cambios
  isLoading = false,
  submitText = 'Guardar',
  cancelText = 'Cancelar',
  className = '',
  showSubmitButton = true,
  showCancelButton = true,
  layout = 'vertical', // 'vertical' | 'horizontal' | 'grid'
  size = 'md',
  externalError = null, // Nuevo prop para errores del backend
}) => {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});

  // Reset form when initialData changes (but not when fields change)
  useEffect(() => {
    console.log('FormularioGenerico - initialData recibido:', initialData);
    console.log('FormularioGenerico - fields:', fields);
    
    // Combinar initialData con valores por defecto de los campos
    const defaultValues = {};
    fields.forEach(field => {
      if (field.defaultValue !== undefined && initialData[field.name] === undefined) {
        defaultValues[field.name] = field.defaultValue;
      }
    });
    
    const finalFormData = { ...defaultValues, ...initialData };
    console.log('FormularioGenerico - finalFormData:', finalFormData);
    
    setFormData(finalFormData);
    setErrors({});
  }, [initialData]); // Removed 'fields' from dependencies

  // Clear external error when form data changes
  useEffect(() => {
    if (externalError) {
      setErrors({});
    }
  }, [formData, externalError]);

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Notificar al componente padre del cambio
    if (onChange) {
      onChange(name, value);
    }
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    handleChange(name, finalValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} es requerido`;
      }
      if (field.validation) {
        const validationError = field.validation(formData[field.name], formData);
        if (validationError) {
          newErrors[field.name] = validationError;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const renderField = (field) => {
    const {
      name,
      label,
      type = 'text',
      placeholder,
      options = [],
      rows = 3,
      className = '',
      disabled = false,
      readOnly = false,
      min,
      max,
      step,
      ...fieldProps
    } = field;

    const fieldError = errors[name];
    const fieldValue = formData[name] || '';

    const baseInputClasses = `block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
      fieldError ? 'border-red-300' : ''
    } ${className}`;

    const baseLabelClasses = `block text-sm font-medium text-gray-700 mb-1 ${
      field.required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''
    }`;

    switch (type) {
      case 'textarea':
        // Filtrar defaultValue de fieldProps para evitar el warning de React
        const { defaultValue: textareaDefaultValue, ...textareaProps } = fieldProps;
        return (
          <div key={name}>
            <label htmlFor={name} className={baseLabelClasses}>
              {label}
            </label>
            <textarea
              id={name}
              name={name}
              rows={rows}
              value={fieldValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              className={`${baseInputClasses} resize-vertical`}
              {...textareaProps}
            />
            {fieldError && (
              <p className="mt-1 text-sm text-red-600">{fieldError}</p>
            )}
          </div>
        );

      case 'select':
        // Filtrar defaultValue de fieldProps para evitar el warning de React
        const { defaultValue, ...selectProps } = fieldProps;
        return (
          <div key={name}>
            <label htmlFor={name} className={baseLabelClasses}>
              {label}
            </label>
            <select
              id={name}
              name={name}
              value={fieldValue}
              onChange={handleInputChange}
              disabled={disabled}
              className={baseInputClasses}
              {...selectProps}
            >
              <option value="">Seleccione una opción</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldError && (
              <p className="mt-1 text-sm text-red-600">{fieldError}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={name} className="flex items-center">
            <input
              id={name}
              name={name}
              type="checkbox"
              checked={fieldValue}
              onChange={handleInputChange}
              disabled={disabled}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              {...fieldProps}
            />
            <label htmlFor={name} className="ml-2 block text-sm text-gray-900">
              {label}
            </label>
            {fieldError && (
              <p className="mt-1 text-sm text-red-600">{fieldError}</p>
            )}
          </div>
        );

      case 'radio':
        return (
          <div key={name}>
            <label className={baseLabelClasses}>{label}</label>
            <div className="space-y-2">
              {options.map((option) => (
                <div key={option.value} className="flex items-center">
                  <input
                    id={`${name}-${option.value}`}
                    name={name}
                    type="radio"
                    value={option.value}
                    checked={fieldValue === option.value}
                    onChange={handleInputChange}
                    disabled={disabled}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <label htmlFor={`${name}-${option.value}`} className="ml-2 block text-sm text-gray-900">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
            {fieldError && (
              <p className="mt-1 text-sm text-red-600">{fieldError}</p>
            )}
          </div>
        );

      case 'number':
        // Filtrar defaultValue de fieldProps para evitar el warning de React
        const { defaultValue: numberDefaultValue, ...numberProps } = fieldProps;
        return (
          <div key={name}>
            <label htmlFor={name} className={baseLabelClasses}>
              {label}
            </label>
            <input
              id={name}
              name={name}
              type="number"
              value={fieldValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              min={min}
              max={max}
              step={step}
              className={baseInputClasses}
              {...numberProps}
            />
            {fieldError && (
              <p className="mt-1 text-sm text-red-600">{fieldError}</p>
            )}
          </div>
        );

      case 'date':
        // Filtrar defaultValue de fieldProps para evitar el warning de React
        const { defaultValue: dateDefaultValue, ...dateProps } = fieldProps;
        return (
          <div key={name}>
            <label htmlFor={name} className={baseLabelClasses}>
              {label}
            </label>
            <input
              id={name}
              name={name}
              type="date"
              value={fieldValue}
              onChange={handleInputChange}
              disabled={disabled}
              readOnly={readOnly}
              className={baseInputClasses}
              {...dateProps}
            />
            {fieldError && (
              <p className="mt-1 text-sm text-red-600">{fieldError}</p>
            )}
          </div>
        );

      case 'time':
        // Filtrar defaultValue de fieldProps para evitar el warning de React
        const { defaultValue: timeDefaultValue, ...timeProps } = fieldProps;
        return (
          <div key={name}>
            <label htmlFor={name} className={baseLabelClasses}>
              {label}
            </label>
            <input
              id={name}
              name={name}
              type="time"
              value={fieldValue}
              onChange={handleInputChange}
              disabled={disabled}
              readOnly={readOnly}
              className={baseInputClasses}
              {...timeProps}
            />
            {fieldError && (
              <p className="mt-1 text-sm text-red-600">{fieldError}</p>
            )}
          </div>
        );

      default:
        // Filtrar defaultValue de fieldProps para evitar el warning de React
        const { defaultValue: defaultDefaultValue, ...defaultProps } = fieldProps;
        return (
          <div key={name}>
            <label htmlFor={name} className={baseLabelClasses}>
              {label}
            </label>
            <input
              id={name}
              name={name}
              type={type}
              value={fieldValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              className={baseInputClasses}
              {...defaultProps}
            />
            {fieldError && (
              <p className="mt-1 text-sm text-red-600">{fieldError}</p>
            )}
          </div>
        );
    }
  };

  const getLayoutClasses = () => {
    switch (layout) {
      case 'horizontal':
        return 'space-y-4';
      case 'grid':
        return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
      default:
        return 'space-y-4';
    }
  };

  return (
    <form id={id} onSubmit={handleSubmit} className={`${getLayoutClasses()} ${className}`}>
      {/* External Error Display */}
      {externalError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {externalError}
        </div>
      )}
      
      {fields.map(renderField)}
      
      {(showSubmitButton || showCancelButton) && (
        <div className="flex justify-end space-x-3 pt-4">
          {showCancelButton && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}
          {showSubmitButton && (
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Guardando...
                </div>
              ) : (
                submitText
              )}
            </button>
          )}
        </div>
      )}
    </form>
  );
};

export default FormularioGenerico;
