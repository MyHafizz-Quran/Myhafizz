import { toast as sonnerToast } from "sonner";

function toast({ title, description, variant, ...rest }) {
  if (variant === "destructive") {
    return sonnerToast.error(title || description, {
      description: title ? description : undefined,
      ...rest,
    });
  }

  if (title && description) {
    return sonnerToast.success(title, { description, ...rest });
  }

  return sonnerToast.success(title || description, rest);
}

function useToast() {
  return {
    toast,
    dismiss: (id) => sonnerToast.dismiss(id),
    toasts: [],
  };
}

export { useToast, toast }; 