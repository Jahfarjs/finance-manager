import { useMemo } from "react";
import { Cell, Label, Pie, PieChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PieChart as PieChartIcon } from "lucide-react";
import type { DailyExpense, EMI } from "@shared/schema";

const chartConfig = {
  expenses: { label: "Expenses", color: "hsl(var(--chart-1))" },
  emi: { label: "EMI / Kuri", color: "hsl(var(--chart-4))" },
  balance: { label: "Balance", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);

const scheduleMonth = (item: { date?: string; month?: string }) => {
  const raw = item.date || item.month || "";
  return raw.substring(0, 7);
};

interface ConsolidatedChartProps {
  months: DailyExpense[];
  emis: EMI[];
}

export function ConsolidatedChart({ months, emis }: ConsolidatedChartProps) {
  const { data, total } = useMemo(() => {
    const currentYm = new Date().toISOString().substring(0, 7);
    const currentMonth = months.find((m) => m.month === currentYm);

    const expenses = currentMonth?.monthlyTotal ?? 0;
    const income = (currentMonth?.salaryCredited ?? 0) + (currentMonth?.monthlyEarnings ?? 0);

    const emiPaid = emis.reduce((sum, emi) => {
      const paidThisMonth = emi.emiSchedule
        .filter((s) => s.status === "paid" && scheduleMonth(s as any) === currentYm)
        .reduce((s, item) => s + item.amount, 0);
      return sum + paidThisMonth;
    }, 0);

    const balance = Math.max(0, income - expenses - emiPaid);

    const rows = [
      { key: "expenses", name: "Expenses", value: expenses, fill: chartConfig.expenses.color },
      { key: "emi", name: "EMI / Kuri", value: emiPaid, fill: chartConfig.emi.color },
      { key: "balance", name: "Balance", value: balance, fill: chartConfig.balance.color },
    ].filter((r) => r.value > 0);

    return { data: rows, total: rows.reduce((s, r) => s + r.value, 0) };
  }, [months, emis]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <PieChartIcon className="h-5 w-5 text-primary" />
          This Month's Flow
        </CardTitle>
        <CardDescription>Where your money is going</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {total === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No data for this month yet.
          </p>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[200px]">
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent hideLabel formatter={(value) => formatCurrency(Number(value))} />}
                />
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} strokeWidth={4}>
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-lg font-bold">
                              {new Intl.NumberFormat("en-IN", { notation: "compact" }).format(total)}
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-muted-foreground text-xs">
                              Total
                            </tspan>
                          </text>
                        );
                      }
                      return null;
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
              {data.map((entry) => (
                <div key={entry.key} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: entry.fill }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                  <span className="font-medium">{formatCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
