import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      position="bottom-center"
      toastOptions={{
        duration: 3000,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:dark:bg-gray-900 group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-emerald-600 group-[.toast]:text-white group-[.toast]:rounded-lg",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          success:
            "group-[.toaster]:!bg-emerald-50 group-[.toaster]:dark:!bg-emerald-950/50 group-[.toaster]:!text-emerald-800 group-[.toaster]:dark:!text-emerald-200 group-[.toaster]:!border-emerald-200 group-[.toaster]:dark:!border-emerald-800",
          error:
            "group-[.toaster]:!bg-red-50 group-[.toaster]:dark:!bg-red-950/50 group-[.toaster]:!text-red-800 group-[.toaster]:dark:!text-red-200 group-[.toaster]:!border-red-200 group-[.toaster]:dark:!border-red-800",
        },
      }}
      style={{
        "--offset":
          "calc(var(--bottom-nav-height, 68px) + env(safe-area-inset-bottom, 0px) + 8px)",
      }}
      closeButton
      richColors
      {...props}
    />
  );
};

export { Toaster };
