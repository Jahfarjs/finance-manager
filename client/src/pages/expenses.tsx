import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parse, startOfMonth, endOfMonth } from "date-fns";
import { Plus, Trash2, Wallet, Calendar, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { PageLoader, LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DailyExpense, ExpenseItem } from "@shared/schema";

// Schema for adding expense items to a day
const expenseDayFormSchema = z.object({
  date: z.date(),
  items: z.array(
    z.object({
      purpose: z.string().min(1, "Purpose is required"),
      amount: z.number().min(0, "Amount must be positive"),
    })
  ).min(1, "At least one expense is required"),
});

type ExpenseDayFormData = z.infer<typeof expenseDayFormSchema>;

export default function ExpensesPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
  const [isBalanceDistributionDialogOpen, setIsBalanceDistributionDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current month's expense data
  const { data: currentMonthExpense, isLoading, error } = useQuery({
    queryKey: ["/api/expenses/month", selectedMonth],
    queryFn: () => api.get<DailyExpense>(`/expenses/month/${selectedMonth}`),
    retry: false, // Don't retry on 404
  });

  // Check if error is 404 (month doesn't exist)
  const monthNotFound = error instanceof ApiError && error.status === 404;

  // Get all months for navigation
  const { data: allMonths } = useQuery({
    queryKey: ["/api/expenses/months"],
    queryFn: () => api.get<DailyExpense[]>("/expenses/months"),
  });

  const form = useForm<ExpenseDayFormData>({
    resolver: zodResolver(expenseDayFormSchema),
    defaultValues: {
      date: new Date(),
      items: [{ purpose: "", amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Create month if it doesn't exist
  const createMonthMutation = useMutation({
    mutationFn: (month: string) =>
      api.post<DailyExpense>("/expenses/month", { month }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/month", selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/months"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

  // Update salary
  const updateSalaryMutation = useMutation({
    mutationFn: ({ month, salaryCredited }: { month: string; salaryCredited: number }) =>
      api.put<DailyExpense>(`/expenses/month/${month}/salary`, { salaryCredited }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/month", selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Salary updated", description: "Salary has been updated for this month." });
      setIsSalaryDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update salary",
        variant: "destructive",
      });
    },
  });

  // Update balance distribution
  const updateBalanceDistributionMutation = useMutation({
    mutationFn: ({ month, balanceSBI, balanceKGB, balanceCash }: { month: string; balanceSBI: number; balanceKGB: number; balanceCash: number }) =>
      api.put<DailyExpense>(`/expenses/month/${month}/balance-distribution`, { balanceSBI, balanceKGB, balanceCash }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/month", selectedMonth] });
      toast({ title: "Balance distribution updated", description: "Balance has been distributed across sources." });
      setIsBalanceDistributionDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update balance distribution",
        variant: "destructive",
      });
    },
  });

  // Add expense day
  const addDayMutation = useMutation({
    mutationFn: async (data: ExpenseDayFormData) => {
      try {
        return await api.post<DailyExpense>(`/expenses/month/${selectedMonth}/day`, {
          date: format(data.date, "yyyy-MM-dd"),
          items: data.items,
        });
      } catch (error: any) {
        // If month doesn't exist (404), create it first and retry
        if (error instanceof ApiError && error.status === 404) {
          try {
            await createMonthMutation.mutateAsync(selectedMonth);
            // Retry the add day mutation
            return await api.post<DailyExpense>(`/expenses/month/${selectedMonth}/day`, {
              date: format(data.date, "yyyy-MM-dd"),
              items: data.items,
            });
          } catch (retryError) {
            throw retryError;
          }
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/month", selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/months"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Expense added", description: "Your expense has been recorded." });
      handleCloseDayDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  // Update expense day
  const updateDayMutation = useMutation({
    mutationFn: ({ date, items }: { date: string; items: ExpenseItem[] }) =>
      api.put<DailyExpense>(`/expenses/month/${selectedMonth}/day/${date}`, {
        date,
        items,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/month", selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Expense updated", description: "Your expense has been updated." });
      handleCloseDayDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update expense",
        variant: "destructive",
      });
    },
  });

  // Delete expense day
  const deleteDayMutation = useMutation({
    mutationFn: (date: string) =>
      api.delete<DailyExpense>(`/expenses/month/${selectedMonth}/day/${date}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/month", selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Expense deleted", description: "The expense day has been removed." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  // Delete expense item
  const deleteItemMutation = useMutation({
    mutationFn: ({ date, itemId }: { date: string; itemId: string }) =>
      api.delete<DailyExpense>(`/expenses/month/${selectedMonth}/day/${date}/item/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/month", selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Item deleted", description: "The expense item has been removed." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const handleCloseDayDialog = () => {
    setIsDayDialogOpen(false);
    form.reset({
      date: new Date(),
      items: [{ purpose: "", amount: 0 }],
    });
  };

  const handleEditDay = (date: string, items: ExpenseItem[]) => {
    form.reset({
      date: parse(date, "yyyy-MM-dd", new Date()),
      items: items.map((item) => ({ purpose: item.purpose, amount: item.amount })),
    });
    setIsDayDialogOpen(true);
  };

  const handleSubmitDay = (data: ExpenseDayFormData) => {
    const dateStr = format(data.date, "yyyy-MM-dd");
    // Check if day already exists
    const existingDay = currentMonthExpense?.days.find((d) => d.date === dateStr);
    
    if (existingDay) {
      // Update existing day
      updateDayMutation.mutate({ date: dateStr, items: data.items });
    } else {
      // Add new day
      addDayMutation.mutate(data);
    }
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    const current = parse(selectedMonth, "yyyy-MM", new Date());
    const newMonth = direction === "prev" 
      ? format(new Date(current.getFullYear(), current.getMonth() - 1, 1), "yyyy-MM")
      : format(new Date(current.getFullYear(), current.getMonth() + 1, 1), "yyyy-MM");
    setSelectedMonth(newMonth);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatMonthName = (month: string) => {
    const date = parse(month, "yyyy-MM", new Date());
    return format(date, "MMMM yyyy");
  };

  // Calculate stats for current month
  const monthlyTotal = currentMonthExpense?.monthlyTotal || 0;
  const salaryCredited = currentMonthExpense?.salaryCredited || 0;
  const balance = currentMonthExpense?.balance || 0;
  const balanceSBI = currentMonthExpense?.balanceSBI || 0;
  const balanceKGB = currentMonthExpense?.balanceKGB || 0;
  const balanceCash = currentMonthExpense?.balanceCash || 0;

  if (isLoading) {
    return <PageLoader />;
  }

  // Sort days by date
  const sortedDays = currentMonthExpense?.days
    ? [...currentMonthExpense.days].sort((a, b) => a.date.localeCompare(b.date))
    : [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-expenses-title">Daily Expenses</h1>
          <p className="text-muted-foreground">Track and manage your monthly expenses</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSalaryDialogOpen} onOpenChange={setIsSalaryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-set-salary">
                <DollarSign className="h-4 w-4 mr-2" />
                Set Salary
              </Button>
            </DialogTrigger>
            <DialogContent key={selectedMonth}>
              <DialogHeader>
                <DialogTitle>Set Monthly Salary</DialogTitle>
                <DialogDescription>
                  Enter your salary for {formatMonthName(selectedMonth)}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const salary = parseFloat(formData.get("salary") as string);
                  if (!isNaN(salary) && salary >= 0) {
                    updateSalaryMutation.mutate({ month: selectedMonth, salaryCredited: salary });
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="salary">Salary Amount</Label>
                  <Input
                    id="salary"
                    name="salary"
                    type="number"
                    placeholder="Enter salary amount"
                    defaultValue={salaryCredited || 0}
                    data-testid="input-salary"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSalaryDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateSalaryMutation.isPending}
                    data-testid="button-submit-salary"
                  >
                    {updateSalaryMutation.isPending ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      "Update Salary"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={isDayDialogOpen} onOpenChange={(open) => !open && handleCloseDayDialog()}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDayDialogOpen(true)} data-testid="button-add-expense">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Expense Day</DialogTitle>
                <DialogDescription>
                  Add expenses for a specific day in {formatMonthName(selectedMonth)}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleSubmitDay)} className="space-y-6">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !form.watch("date") && "text-muted-foreground"
                        )}
                        data-testid="button-select-date"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {form.watch("date") ? format(form.watch("date"), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={form.watch("date")}
                        onSelect={(date) => date && form.setValue("date", date)}
                        initialFocus
                        disabled={(date) => {
                          const monthStart = startOfMonth(parse(selectedMonth, "yyyy-MM", new Date()));
                          const monthEnd = endOfMonth(parse(selectedMonth, "yyyy-MM", new Date()));
                          return date < monthStart || date > monthEnd;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Expense Items</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ purpose: "", amount: 0 })}
                      data-testid="button-add-item"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-3 items-start">
                      <div className="flex-1 space-y-1">
                        <Input
                          placeholder="Purpose (e.g., Food, Travel)"
                          {...form.register(`items.${index}.purpose`)}
                          data-testid={`input-purpose-${index}`}
                        />
                        {form.formState.errors.items?.[index]?.purpose && (
                          <p className="text-xs text-destructive">
                            {form.formState.errors.items[index]?.purpose?.message}
                          </p>
                        )}
                      </div>
                      <div className="w-32 space-y-1">
                        <Input
                          type="number"
                          placeholder="Amount"
                          {...form.register(`items.${index}.amount`, { valueAsNumber: true })}
                          data-testid={`input-amount-${index}`}
                        />
                      </div>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          data-testid={`button-remove-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-mono font-bold">
                    {formatCurrency(
                      form.watch("items").reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
                    )}
                  </span>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={handleCloseDayDialog}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addDayMutation.isPending || updateDayMutation.isPending}
                    data-testid="button-submit-expense"
                  >
                    {(addDayMutation.isPending || updateDayMutation.isPending) ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      "Add Expense"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Month Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleMonthChange("prev")}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h2 className="text-2xl font-bold">{formatMonthName(selectedMonth)}</h2>
              {currentMonthExpense && (
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Salary: {formatCurrency(salaryCredited)}</span>
                  <span>Balance: {formatCurrency(balance)}</span>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleMonthChange("next")}
              data-testid="button-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Balance Distribution */}
      {currentMonthExpense && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Balance Distribution</CardTitle>
                <CardDescription>
                  Total Balance: {formatCurrency(balance)}
                </CardDescription>
              </div>
              <Dialog open={isBalanceDistributionDialogOpen} onOpenChange={setIsBalanceDistributionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Distribute Balance
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Distribute Balance</DialogTitle>
                    <DialogDescription>
                      Divide the balance ({formatCurrency(balance)}) across SBI, KGB, and Cash. The sum must equal the total balance.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const sbi = parseFloat(formData.get("sbi") as string) || 0;
                      const kgb = parseFloat(formData.get("kgb") as string) || 0;
                      const cash = parseFloat(formData.get("cash") as string) || 0;
                      const total = sbi + kgb + cash;
                      
                      if (Math.abs(total - balance) > 0.01) {
                        toast({
                          title: "Invalid distribution",
                          description: `Sum (${formatCurrency(total)}) must equal balance (${formatCurrency(balance)})`,
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      updateBalanceDistributionMutation.mutate({
                        month: selectedMonth,
                        balanceSBI: sbi,
                        balanceKGB: kgb,
                        balanceCash: cash,
                      });
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="sbi">SBI Amount</Label>
                      <Input
                        id="sbi"
                        name="sbi"
                        type="number"
                        placeholder="Enter SBI amount"
                        defaultValue={balanceSBI}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kgb">KGB Amount</Label>
                      <Input
                        id="kgb"
                        name="kgb"
                        type="number"
                        placeholder="Enter KGB amount"
                        defaultValue={balanceKGB}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cash">Cash Amount</Label>
                      <Input
                        id="cash"
                        name="cash"
                        type="number"
                        placeholder="Enter Cash amount"
                        defaultValue={balanceCash}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsBalanceDistributionDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateBalanceDistributionMutation.isPending}
                      >
                        {updateBalanceDistributionMutation.isPending ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          "Update Distribution"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">SBI</p>
                    <p className="text-2xl font-bold">{formatCurrency(balanceSBI)}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">KGB</p>
                    <p className="text-2xl font-bold">{formatCurrency(balanceKGB)}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cash</p>
                    <p className="text-2xl font-bold">{formatCurrency(balanceCash)}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Month Expenses */}
      {monthNotFound || !currentMonthExpense || sortedDays.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Wallet}
              title={monthNotFound ? "Month not created yet" : "No expenses for this month"}
              description={
                monthNotFound
                  ? "Create this month by adding your first expense day."
                  : "Start tracking your expenses by adding your first expense day."
              }
              actionLabel="Add First Expense"
              onAction={() => setIsDayDialogOpen(true)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{formatMonthName(selectedMonth)} Expenses</CardTitle>
            <CardDescription>
              Monthly Total: {formatCurrency(monthlyTotal)} | Balance: {formatCurrency(balance)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedDays.map((day) => (
                <div
                  key={day.date}
                  className="p-4 rounded-lg border bg-card"
                  data-testid={`expense-day-${day.date}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(parse(day.date, "yyyy-MM-dd", new Date()), "EEEE, MMMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-bold text-primary">
                        {formatCurrency(day.dayTotal)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditDay(day.date, day.items)}
                        data-testid={`button-edit-day-${day.date}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteDayMutation.mutate(day.date)}
                        data-testid={`button-delete-day-${day.date}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {day.items.map((item, idx) => {
                      const itemId = (item as any)._id?.toString() || idx.toString();
                      return (
                        <div
                          key={itemId}
                          className="flex items-center justify-between p-2 rounded-md bg-muted"
                        >
                          <span className="text-sm">
                            {item.purpose}: {formatCurrency(item.amount)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              deleteItemMutation.mutate({ date: day.date, itemId });
                            }}
                            data-testid={`button-delete-item-${day.date}-${idx}`}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
