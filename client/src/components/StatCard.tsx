import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  className = "",
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-xl sm:text-2xl font-bold font-mono mt-1 truncate">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{description}</p>
            )}
          </div>
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
