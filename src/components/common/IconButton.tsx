import type { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  title?: string;
}

export function IconButton({
  children,
  className,
  title,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn(
        "no-drag flex items-center justify-center rounded transition-colors",
        className
      )}
      title={title}
      {...props}
    >
      {children}
    </button>
  );
}
