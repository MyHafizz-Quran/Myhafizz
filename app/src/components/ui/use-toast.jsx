import { toast as sonnerToast } from "sonner";
import { report } from "@/lib/report";

/** Les toasts d'erreur ne sont jamais affichés : ils partent sur Sentry. */
function toast({ title, description, variant, ...rest }) {
  if (variant === "destructive") {
    report(new Error([title, description].filter(Boolean).join(" : ")), "toast");
    return null;
  }
  if (title && description) return sonnerToast.success(title, { description, ...rest });
  return sonnerToast.success(title || description, rest);
}

function useToast() {
  return { toast, dismiss: (id) => sonnerToast.dismiss(id), toasts: [] };
}

export { useToast, toast };
