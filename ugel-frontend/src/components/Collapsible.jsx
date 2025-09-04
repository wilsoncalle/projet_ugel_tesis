import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const Collapsible = ({ 
  trigger, 
  children, 
  defaultOpen = false,
  className = '',
  triggerClassName = '',
  contentClassName = '',
  onToggle,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (onToggle) {
      onToggle(newState);
    }
  };

  return (
    <div className={`${className}`} {...props}>
      {/* Trigger */}
      <button
        onClick={handleToggle}
        className={`w-full flex items-center justify-between p-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors rounded-lg ${triggerClassName}`}
      >
        <span>{trigger}</span>
        <ChevronDownIcon 
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Content */}
      {isOpen && (
        <div className={`mt-4 space-y-2 ${contentClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
};

const CollapsibleItem = ({ 
  children, 
  onClick, 
  selected = false,
  className = '',
  ...props 
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2 text-left text-sm rounded-lg transition-colors cursor-pointer ${
        selected 
          ? 'bg-blue-50 border-l-4 border-l-blue-500 text-blue-900' 
          : 'text-gray-700 hover:bg-muted/50'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Collapsible;
export { CollapsibleItem };
