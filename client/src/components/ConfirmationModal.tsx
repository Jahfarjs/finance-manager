import { AlertTriangle, LogOut, Lock, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ModalVariant = "delete" | "logout" | "password";

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  variant?: ModalVariant;
  title?: string;
  description?: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

const variantConfig: Record<
  ModalVariant,
  {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    defaultTitle: string;
    defaultDescription: string;
    defaultConfirmLabel: string;
    confirmVariant: "destructive" | "default";
  }
> = {
  delete: {
    icon: Trash2,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    defaultTitle: "Delete Item",
    defaultDescription:
      "Are you sure you want to delete this? This action cannot be undone.",
    defaultConfirmLabel: "Delete",
    confirmVariant: "destructive",
  },
  logout: {
    icon: LogOut,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    defaultTitle: "Sign Out",
    defaultDescription:
      "Are you sure you want to sign out? You will need to log in again to access your account.",
    defaultConfirmLabel: "Sign Out",
    confirmVariant: "default",
  },
  password: {
    icon: Lock,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    defaultTitle: "Change Password",
    defaultDescription:
      "Are you sure you want to change your password? Make sure you remember your new password.",
    defaultConfirmLabel: "Change Password",
    confirmVariant: "default",
  },
};

export function ConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  variant = "delete",
  title,
  description,
  confirmLabel,
  isLoading = false,
}: ConfirmationModalProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader className="gap-0">
          <div className="flex flex-col items-center gap-4 pb-2">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full ${config.iconBg}`}>
              <Icon className={`h-8 w-8 ${config.iconColor}`} />
            </div>
            <div className="space-y-1.5 text-center">
              <DialogTitle className="text-xl font-semibold">
                {title ?? config.defaultTitle}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                {description ?? config.defaultDescription}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="sm:min-w-[120px]"
          >
            Cancel
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={isLoading}
            className="sm:min-w-[120px]"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </span>
            ) : (
              confirmLabel ?? config.defaultConfirmLabel
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
