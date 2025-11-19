import { forwardRef } from 'react';

const Button = forwardRef(
  (
    {
      children,
      type = 'button',
      variant = 'primary',
      size = 'md',
      className = '',
      isLoading = false,
      isFullWidth = false,
      leftIcon = null,
      rightIcon = null,
      ...props
    },
    ref
  ) => {
    // Base classes
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-full focus:outline-none transition-colors';
    
    // Size classes: 
    // CAMBIOS: 
    // 1. Usamos 'min-h' en lugar de 'h' fija para permitir crecimiento.
    // 2. Redujimos 'px' (de 6 a 5 en lg) para que no se vea tan ancho.
    // 3. Ajustamos 'py' para dar aire al texto multilínea.
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm min-h-[2.5rem]',     // antes h-10
      md: 'px-4 py-2.5 text-sm min-h-[2.75rem]',  // antes h-11
      lg: 'px-5 py-2.5 text-base min-h-[3rem]',   // antes h-12 (px bajado de 6 a 5)
    };
    
    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
      secondary: 'bg-slate-800 text-white hover:bg-slate-900 focus:ring-2 focus:ring-offset-2 focus:ring-slate-500',
      outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
      ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-offset-2 focus:ring-red-500',
    };
    
    const widthClasses = isFullWidth ? 'w-full' : '';
    const stateClasses = (props.disabled || isLoading) ? 'opacity-60 cursor-not-allowed' : '';
    
    const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClasses} ${stateClasses} ${className}`;
    
    return (
      <button type={type} className={classes} disabled={props.disabled || isLoading} ref={ref} {...props}>
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 flex-shrink-0 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        
        {/* Icono Izquierdo: flex-shrink-0 evita que se aplaste si hay mucho texto */}
        {leftIcon && !isLoading && <span className="mr-2 flex-shrink-0 flex items-center">{leftIcon}</span>}
        
        {/* CONTENIDO DEL TEXTO: Aquí está la magia para las 2 líneas */}
        <span className="line-clamp-2 text-center leading-snug break-words">
          {children}
        </span>

        {/* Icono Derecho */}
        {rightIcon && <span className="ml-2 flex-shrink-0 flex items-center">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;