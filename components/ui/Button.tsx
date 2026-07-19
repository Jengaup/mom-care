import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-status-done text-white active:bg-green-700",
  secondary: "bg-white text-gray-800 border border-gray-300 active:bg-gray-100",
  ghost: "bg-transparent text-gray-700 active:bg-gray-100",
  danger: "bg-status-late text-white active:bg-red-700",
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
        className={`min-h-touch min-w-touch inline-flex items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${className}`}
        {...props}
      />
    );
  },
);
