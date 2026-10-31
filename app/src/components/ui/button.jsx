import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Bouton en relief façon Duolingo : couleur pleine + ombre nette de 4 px, s'enfonce au toucher
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-[15px] font-extrabold tracking-[0.01em] select-none transition-[transform,box-shadow,background-color,filter] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground [--relief-color:var(--primary-lip)] shadow-relief hover:brightness-105 active:translate-y-[4px] active:shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground [--relief-color:#B91C1C] shadow-relief active:translate-y-[4px] active:shadow-none",
        outline:
          "border-2 border-border bg-card text-foreground [--relief-color:hsl(var(--border))] shadow-relief hover:bg-muted active:translate-y-[4px] active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground [--relief-color:#C98E14] shadow-relief active:translate-y-[4px] active:shadow-none",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.97]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-10 rounded-xl px-4 text-sm",
        lg: "h-[52px] px-8 text-base",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
