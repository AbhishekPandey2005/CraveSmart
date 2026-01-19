import React from 'react';

interface ThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDarkMode, onToggle, className = '' }) => {
  return (
    <div 
      onClick={onToggle}
      className={`w-12 h-7 flex items-center bg-slate-200 dark:bg-slate-700 rounded-full p-1 cursor-pointer transition-colors duration-300 relative ${className}`}
      aria-label="Toggle Dark Mode"
    >
      <div 
        className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center text-xs absolute ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`}
      >
        {isDarkMode ? '🌙' : '☀️'}
      </div>
    </div>
  );
};