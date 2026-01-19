import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  suffix?: string;
}

export const FormInput: React.FC<FormInputProps> = ({ label, suffix, className = '', ...props }) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">{label}</label>
      <div className="relative">
        <input
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block p-3 outline-none hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors"
          {...props}
        />
        {suffix && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-slate-500 text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};