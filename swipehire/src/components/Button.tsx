import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type Variant = 'primary' | 'secondary' | 'like' | 'nope';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  primary:
    'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/30 focus-visible:ring-indigo-400',
  secondary:
    'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 focus-visible:ring-slate-400',
  like: 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30 focus-visible:ring-emerald-400',
  nope: 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30 focus-visible:ring-rose-400'
};

export default function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
