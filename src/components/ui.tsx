import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink-900 text-parchment hover:bg-ink-800 focus-visible:ring-ink-400",
  secondary:
    "bg-gold-500 text-white hover:bg-gold-600 focus-visible:ring-gold-300",
  ghost:
    "bg-transparent text-ink-700 hover:bg-ink-50 border border-ink-200 focus-visible:ring-ink-200",
  danger: "bg-danger text-white hover:opacity-90 focus-visible:ring-red-300",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
>(function Button({ className, variant = "primary", size = "md", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-parchment",
        "disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  );
});

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card p-6", className)} {...props} />;
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn("input", className)} {...props} />;
});

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-400">{hint}</span> : null}
    </label>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "gold" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "bg-ink-100 text-ink-600",
    gold: "bg-gold-100 text-gold-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
  } as const;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 text-white font-serif text-lg leading-none shadow-soft">
        A
      </span>
      <span className="font-serif text-xl tracking-tight text-ink-900">Aurelia</span>
    </span>
  );
}
