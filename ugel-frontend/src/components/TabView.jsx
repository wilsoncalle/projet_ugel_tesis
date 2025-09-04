import { useState } from 'react';

const TabView = ({ tabs, activeTab, onTabChange, children, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Tab List - Pill Style Slider */}
      <div className="bg-muted rounded-full p-1 grid grid-cols-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-300 ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {tab.icon && (
                <span className="h-4 w-4 flex-shrink-0">
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`py-0.5 px-1.5 rounded-full text-xs font-medium ${
                  activeTab === tab.key
                    ? 'bg-primary-100 text-primary-800'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6 flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default TabView;
