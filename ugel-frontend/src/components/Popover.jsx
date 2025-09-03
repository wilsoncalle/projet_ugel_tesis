import { useState, useRef, useEffect } from 'react';

const Popover = ({ 
  children, 
  content, 
  placement = 'bottom',
  trigger = 'click',
  className = '',
  isOpen: controlledIsOpen,
  onOpenChange,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const contentRef = useRef(null);

  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : isOpen;

  const handleToggle = () => {
    const newState = !open;
    if (!isControlled) {
      setIsOpen(newState);
    }
    onOpenChange?.(newState);
  };

  const handleClose = () => {
    if (!isControlled) {
      setIsOpen(false);
    }
    onOpenChange?.(false);
  };

  useEffect(() => {
    if (open && triggerRef.current && contentRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();
      
      let top = triggerRect.bottom + window.scrollY + 8;
      let left = triggerRect.left + window.scrollX;

      // Adjust for different placements
      switch (placement) {
        case 'top':
          top = triggerRect.top + window.scrollY - contentRect.height - 8;
          break;
        case 'left':
          top = triggerRect.top + window.scrollY;
          left = triggerRect.left + window.scrollX - contentRect.width - 8;
          break;
        case 'right':
          top = triggerRect.top + window.scrollY;
          left = triggerRect.right + window.scrollX + 8;
          break;
        case 'bottom':
        default:
          // Already set above
          break;
      }

      // Keep popover within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (left + contentRect.width > viewportWidth) {
        left = viewportWidth - contentRect.width - 16;
      }
      if (left < 16) {
        left = 16;
      }
      
      if (top + contentRect.height > viewportHeight + window.scrollY) {
        top = triggerRect.top + window.scrollY - contentRect.height - 8;
      }
      if (top < window.scrollY + 16) {
        top = window.scrollY + 16;
      }

      setPosition({ top, left });
    }
  }, [open, placement]);

  useEffect(() => {
    if (open) {
      const handleClickOutside = (event) => {
        if (
          contentRef.current &&
          !contentRef.current.contains(event.target) &&
          triggerRef.current &&
          !triggerRef.current.contains(event.target)
        ) {
          handleClose();
        }
      };

      const handleEscape = (event) => {
        if (event.key === 'Escape') {
          handleClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [open]);

  return (
    <>
      <div
        ref={triggerRef}
        onClick={trigger === 'click' ? handleToggle : undefined}
        onMouseEnter={trigger === 'hover' ? handleToggle : undefined}
        onMouseLeave={trigger === 'hover' ? handleClose : undefined}
        className={className}
        {...props}
      >
        {children}
      </div>

      {open && (
        <div
          ref={contentRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          {content}
        </div>
      )}
    </>
  );
};

export default Popover;
