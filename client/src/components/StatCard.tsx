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
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-sm font-medium text-muted-foreground leading-tight line-clamp-2">{title}</p>
            <p className="text-sm sm:text-xl font-bold font-mono mt-1 truncate">{value}</p>
            {description && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
            )}
          </div>
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
