import { forwardRef } from 'react';

const Card = forwardRef(
  ({ children, className = '', title, footer, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white shadow rounded-xl overflow-hidden ${className}`}
        {...props}
      >
        {title && (
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            {typeof title === 'string' ? (
              <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
            ) : (
              title
            )}
          </div>
        )}
        
        <div className="px-4 py-5 sm:p-6">{children}</div>
        
        {footer && (
          <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
