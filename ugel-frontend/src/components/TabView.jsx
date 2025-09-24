import React from "react";
import { AnimatePresence, motion } from "framer-motion";

const TabView = ({ tabs, activeTab, onTabChange, children, className = "" }) => {
  const handleTabClick = (tabKey, event) => {
    onTabChange(tabKey);

    const buttonElement = event.target.closest("button") || event.currentTarget;
    if (buttonElement && typeof buttonElement.blur === "function") {
      buttonElement.blur();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Botones de tabs con pill animado */}
      <div className="bg-muted rounded-full p-1 grid grid-cols-2 relative">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={(event) => handleTabClick(tab.key, event)}
              className={`relative z-10 px-4 py-2 rounded-full font-medium text-sm transition-colors duration-300 flex items-center justify-center gap-2 ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon && (
                <span className="h-4 w-4 flex-shrink-0">{tab.icon}</span>
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`py-0.5 px-1.5 rounded-full text-xs font-medium ${
                    isActive
                      ? "bg-primary-100 text-primary-800"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {/* Fondo animado del tab activo */}
              {isActive && (
                <motion.span
                  layoutId="active-pill"
                  className="absolute inset-0 bg-background rounded-full shadow-md -z-10"
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Contenido animado */}
      <div className="mt-6 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ 
              duration: 0.2, 
              ease: "easeInOut" 
            }}
            className="w-full"
          >
            {/* Soporte para ambos patrones: children como objeto o como elemento React */}
            {typeof children === 'object' && !React.isValidElement(children) 
              ? children[activeTab] 
              : children
            }
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TabView;