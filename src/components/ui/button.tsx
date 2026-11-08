import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const styles = cva("app-button", {
  variants: {
    variant: {
      default: "app-button-primary",
      secondary: "app-button-secondary",
      ghost: "app-button-ghost",
      danger: "app-button-danger",
    },
    size: {
      default: "app-button-default",
      sm: "app-button-sm",
      icon: "app-button-icon",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof styles> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(styles({ variant, size }), className)} {...props} />
  );
}
