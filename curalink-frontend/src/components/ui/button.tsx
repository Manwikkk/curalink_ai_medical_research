import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-all",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-border/60 bg-card/40 backdrop-blur-md hover:bg-card/70 hover:border-primary/40 transition-all",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent/30 hover:text-foreground transition-colors",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "relative bg-[image:var(--gradient-primary)] text-primary-foreground font-semibold shadow-[0_8px_30px_-8px_oklch(0.78_0.14_195/0.5)] hover:shadow-[0_12px_40px_-8px_oklch(0.78_0.14_195/0.7)] hover:scale-[1.02] active:scale-[0.99] transition-all duration-300",
        glass:
          "glass-strong text-foreground hover:border-primary/40 hover:text-primary transition-all duration-300",
        premium:
          "bg-card/60 backdrop-blur-xl border border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary/60 hover:shadow-[var(--glow-primary)] transition-all duration-300",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
