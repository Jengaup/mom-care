import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-sm active:bg-brand-dark",
  secondary: "bg-surface text-ink border border-line active:bg-black/[0.03]",
  ghost: "bg-transparent text-muted active:bg-black/[0.03]",
  danger: "bg-status-late text-white active:brightness-95",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

/** Botón con target táctil >= 48px (spec 6). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", className = "", ...props }, ref) {
    return (
      <button
        ref={ref}
        className={`min-h-touch min-w-touch inline-flex items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition-[background-color,filter] disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${className}`}
        {...props}
      />
    );
  },
);
