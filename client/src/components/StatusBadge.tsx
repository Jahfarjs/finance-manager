import { Badge } from "@/components/ui/badge";

type StatusType = 
  | "paid" 
  | "unpaid" 
  | "completed" 
  | "pending" 
  | "worked" 
  | "not_worked";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Paid", variant: "default" },
  unpaid: { label: "Unpaid", variant: "secondary" },
  completed: { label: "Completed", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  worked: { label: "Worked", variant: "default" },
  not_worked: { label: "Not Worked", variant: "secondary" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
