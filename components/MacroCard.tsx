import React from 'react';

interface MacroCardProps {
  label: string;
  value: number;
  unit: string;
  colorClass: string;
}

export const MacroCard: React.FC<MacroCardProps> = ({ label, value, unit, colorClass }) => {
  return (
    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 transition-colors">
      <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1">{label}</span>
      <div className={`text-xl font-bold ${colorClass}`}>
        {value}{unit}
      </div>
    </div>
  );
};