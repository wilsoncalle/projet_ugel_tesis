import { useState, useRef, useEffect } from 'react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

const DropdownMenu = ({ 
  trigger, 
  children, 
  className = '',
  align = 'right',
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 transform -translate-x-1/2'
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
        {...props}
      >
        {trigger || <EllipsisVerticalIcon className="h-4 w-4" />}
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className={`absolute z-50 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-md ${alignmentClasses[align]} ${className}`}>
          <div className="py-1">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

const DropdownMenuItem = ({ 
  children, 
  onClick, 
  className = '',
  icon,
  disabled = false,
  ...props 
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${className}`}
      {...props}
    >
      {icon && <span className="h-4 w-4 flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

const DropdownMenuSeparator = ({ className = '' }) => {
  return <div className={`my-1 border-t border-gray-200 ${className}`} />;
};

export default DropdownMenu;
export { DropdownMenuItem, DropdownMenuSeparator };
