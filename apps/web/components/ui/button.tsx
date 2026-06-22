import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md";
};

const variantClass = {
  primary: "bg-primary text-primary-foreground hover:bg-[#1B312E]",
  secondary: "bg-muted text-foreground hover:bg-[#E6E2D8]",
  outline: "border border-border bg-transparent text-foreground hover:bg-muted",
  ghost: "bg-transparent text-foreground hover:bg-muted"
};

const sizeClass = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm"
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_[data-icon]]:size-4",
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...props}
    />
  );
}
