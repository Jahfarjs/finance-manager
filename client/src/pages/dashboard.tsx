import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Target, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { PageLoader } from "@/components/LoadingSpinner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { DashboardStats, Goal, EMI, DailyExpense } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => api.get<DashboardStats>("/dashboard/stats"),
  });

  const { data: recentExpenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["/api/expenses", "recent"],
    queryFn: () => api.get<DailyExpense[]>("/expenses?limit=5"),
  });

  const { data: goals } = useQuery({
    queryKey: ["/api/goals"],
    queryFn: () => api.get<Goal[]>("/goals"),
  });

  const { data: emis } = useQuery({
    queryKey: ["/api/emis"],
    queryFn: () => api.get<EMI[]>("/emis"),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (statsLoading || expensesLoading) {
    return <PageLoader />;
  }

  const pendingGoals = goals?.filter((g) => g.status === "pending") || [];
  const activeEmis = emis?.filter((e) => e.remainingAmount > 0) || [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">
          Welcome back, {user?.name?.split(" ")[0] || "User"}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your financial status
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats?.totalExpenses || 0)}
          icon={Wallet}
          description="This month"
        />
        <StatCard
          title="Available Balance"
          value={formatCurrency(stats?.balance || 0)}
          icon={PiggyBank}
          description="After expenses"
        />
        <StatCard
          title="Total Credit"
          value={formatCurrency(stats?.totalCredit || 0)}
          icon={TrendingUp}
          description="Money to receive"
        />
        <StatCard
          title="Total Debit"
          value={formatCurrency(stats?.totalDebit || 0)}
          icon={TrendingDown}
          description="Money to pay"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Pending Goals
            </CardTitle>
            <CardDescription>Your active monthly goals</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No pending goals. Start by adding some!
              </p>
            ) : (
              <div className="space-y-3">
                {pendingGoals.slice(0, 5).map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`goal-item-${goal.id}`}
                  >
                    <span className="font-medium">{goal.goalName}</span>
                    <span className="text-sm text-muted-foreground">Pending</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Active EMIs
            </CardTitle>
            <CardDescription>Your ongoing EMI payments</CardDescription>
          </CardHeader>
          <CardContent>
            {activeEmis.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No active EMIs. All caught up!
              </p>
            ) : (
              <div className="space-y-3">
                {activeEmis.slice(0, 5).map((emi) => (
                  <div
                    key={emi.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`emi-item-${emi.id}`}
                  >
                    <div>
                      <span className="font-medium">{emi.emiTitle}</span>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(emi.emiAmountPerMonth)}/month
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono font-semibold">
                        {formatCurrency(emi.remainingAmount)}
                      </span>
                      <p className="text-xs text-muted-foreground">remaining</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Recent Expenses
          </CardTitle>
          <CardDescription>Your latest expense entries</CardDescription>
        </CardHeader>
        <CardContent>
          {!recentExpenses || recentExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No expenses recorded yet. Start tracking!
            </p>
          ) : (
            <div className="space-y-3">
              {recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  data-testid={`expense-item-${expense.id}`}
                >
                  <div>
                    <span className="font-medium">
                      {new Date(expense.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {expense.expenses.length} item(s)
                    </p>
                  </div>
                  <span className="font-mono font-semibold">
                    {formatCurrency(expense.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
