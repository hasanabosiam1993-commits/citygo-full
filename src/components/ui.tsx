import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

export function Button({
  children,
  loading,
  variant = 'primary',
  fullWidth,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary:
      'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm',
    secondary:
      'bg-secondary-500 text-white hover:bg-secondary-600 active:bg-secondary-700 shadow-sm',
    outline:
      'bg-white text-primary-500 border-2 border-primary-200 hover:border-primary-300 active:bg-primary-50',
  };

  return (
    <button
      className={`flex items-center justify-center gap-2 rounded-xl2 px-5 py-3.5 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export function Input({ label, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-semibold text-neutral-700">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={`w-full bg-white border-2 rounded-xl2 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:border-primary-500 ${
            error ? 'border-error-400' : 'border-neutral-200'
          } ${icon ? 'pr-11' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-error-500 font-medium">{error}</p>}
    </div>
  );
}

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-semibold text-neutral-700">{label}</label>
      )}
      <select
        className={`w-full bg-white border-2 rounded-xl2 px-4 py-3 text-sm text-neutral-900 transition-colors focus:outline-none focus:border-primary-500 appearance-none ${
          error ? 'border-error-400' : 'border-neutral-200'
        } ${className}`}
        {...props as InputHTMLAttributes<HTMLSelectElement>}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-error-500 font-medium">{error}</p>}
    </div>
  );
}
