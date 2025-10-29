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
      <div className="bg-muted rounded-full p-1 flex items-center relative overflow-hidden" style={{ minHeight: '2.5rem' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const isStatsButton = tab.isStatsButton;
          
          // Si es el botón de estadísticas, renderizar de forma diferente
          if (isStatsButton) {
            return (
              <button
                key={tab.key}
                onClick={(event) => handleTabClick(tab.key, event)}
                className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ml-2 ${
                  isActive
                    ? "bg-background shadow-md"
                    : "bg-transparent"
                }`}
                title="Estadísticas"
              >
                <svg 
                  className={`h-5 w-5 transition-colors duration-300 ${
                    isActive 
                      ? 'text-foreground' 
                      : 'text-muted-foreground hover:text-black'
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                
                {/* Píldora animada para estadísticas */}
                {isActive && (
                  <motion.span
                    layoutId="active-pill"
                    className="absolute inset-0 bg-background rounded-full shadow-md -z-10"
                    style={{ pointerEvents: 'none' }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                      bounce: 0.3
                    }}
                  />
                )}
              </button>
            );
          }
          
          // Renderizar tabs normales
          return (
            <button
              key={tab.key}
              onClick={(event) => handleTabClick(tab.key, event)}
              className={`relative z-10 px-4 py-[0.5rem] rounded-full font-medium text-sm transition-colors duration-300 flex items-center justify-center gap-2 flex-1 ${
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
                  className={`inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full text-xs font-medium ${
                    isActive
                      ? "bg-primary-100 text-primary-800"
                      : "bg-gray-200 text-gray-700"
                  }`}
                  style={{ lineHeight: '1rem' }}
                >
                  {tab.count}
                </span>
              )}
              {/* Fondo animado del tab activo */}
              {isActive && (
                <motion.span
                  layoutId="active-pill"
                  className="absolute inset-0 bg-background rounded-full shadow-md -z-10"
                  style={{ pointerEvents: 'none' }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    bounce: 0.3
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