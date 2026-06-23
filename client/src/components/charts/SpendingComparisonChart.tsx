import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { TrendingUp } from "lucide-react";
import type { DailyExpense } from "@shared/schema";

const chartConfig = {
  previous: { label: "Previous", color: "hsl(var(--chart-2))" },
  current: { label: "Current", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const monthName = (ym: string) => {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
};

const compactCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);

interface SpendingComparisonChartProps {
  months: DailyExpense[];
}

export function SpendingComparisonChart({ months }: SpendingComparisonChartProps) {
  const { data, currentLabel, previousLabel } = useMemo(() => {
    const currentYm = new Date().toISOString().substring(0, 7);
    // Guard against documents where `month` might be undefined/null
    const valid = months.filter((m) => typeof m.month === "string" && m.month.length > 0);
    const sorted = [...valid].sort((a, b) => a.month.localeCompare(b.month));
    const currentIdx = sorted.findIndex((m) => m.month === currentYm);

    const current = currentIdx >= 0 ? sorted[currentIdx] : sorted[sorted.length - 1];
    const previous =
      currentIdx > 0
        ? sorted[currentIdx - 1]
        : sorted.length >= 2 && currentIdx === -1
        ? sorted[sorted.length - 2]
        : undefined;

    const currentLbl = current ? monthName(current.month) : "Current";
    const previousLbl = previous ? monthName(previous.month) : "Previous";

    return {
      currentLabel: currentLbl,
      previousLabel: previousLbl,
      data: [
        {
          category: "Spending",
          previous: previous?.monthlyTotal ?? 0,
          current: current?.monthlyTotal ?? 0,
        },
        {
          category: "Earning",
          previous: (previous?.monthlyEarnings ?? 0) + (previous?.salaryCredited ?? 0),
          current: (current?.monthlyEarnings ?? 0) + (current?.salaryCredited ?? 0),
        },
      ],
    };
  }, [months]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Monthly Comparison
        </CardTitle>
        <CardDescription>
          {previousLabel} vs {currentLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {data[0].previous === 0 && data[0].current === 0 && data[1].previous === 0 && data[1].current === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No data available yet.</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                fontSize={11}
                tickFormatter={(v) => compactCurrency(Number(v))}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="previous" fill="var(--color-previous)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="current" fill="var(--color-current)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
