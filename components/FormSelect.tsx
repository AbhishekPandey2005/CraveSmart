import React from 'react';

interface Option {
  label: string;
  value: string | number;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Option[];
}

export const FormSelect: React.FC<FormSelectProps> = ({ label, options, className = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">{label}</label>
      <div className="relative">
        <select
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block p-3 appearance-none cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors"
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};