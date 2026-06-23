import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parse, startOfMonth, endOfMonth } from "date-fns";
import { Plus, Trash2, Wallet, Calendar, DollarSign, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
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
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DailyExpense, ExpenseItem } from "@shared/schema";

const expenseDayFormSchema = z.object({
  date: z.date(),
  items: z.array(
    z.object({
      purpose: z.string().min(1, "Purpose is required"),
      amount: z.number().min(0, "Amount must be positive"),
      type: z.enum(["expense", "earning"]),
    })
  ).min(1, "At least one item is required"),
});

type ExpenseDayFormData = z.infer<typeof expenseDayFormSchema>;

export default function ExpensesPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
  const [isBalanceDistributionDialogOpen, setIsBalanceDistributionDialogOpen] = useState(false);
  const [deleteDayConfirm, setDeleteDayConfirm] = useState<{ open: boolean; date: string | null }>({ open: false, date: null });
  const [deleteItemConfirm, setDeleteItemConfirm] = useState<{ open: boolean; date: string | null; itemId: string | null }>({ open: false, date: null, itemId: null });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentMonthExpense, isLoading, error } = useQuery({
    queryKey: ["/api/expenses/month", selectedMonth],
    queryFn: () => api.get<DailyExpense>(`/expenses/month/${selectedMonth}`),
    retry: false,
  });

  const monthNotFound = error instanceof ApiError && error.status === 404;

  const { data: allMonths } = useQuery({
    queryKey: ["/api/expenses/months"],
    queryFn: () => api.get<DailyExpense[]>("/expenses/months"),
  });

  const form = useForm<ExpenseDayFormData>({
    resolver: zodResolver(expenseDayFormSchema),
    defaultValues: {
      date: new Date(),
      items: [{ purpose: "", amount: 0, type: "expense" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const createMonthMutation = useMutation({
    mutationFn: (month: string) =>
      api.post<DailyExpense>("/expenses/month", { month }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/month", selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/months"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

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

  const addDayMutation = useMutation({
    mutationFn: async (data: ExpenseDayFormData) => {
      try {
        return await api.post<DailyExpense>(`/expenses/month/${selectedMonth}/day`, {
          date: format(data.date, "yyyy-MM-dd"),
          items: data.items,
        });
      } catch (error: any) {
        if (error instanceof ApiError && error.status === 404) {
          try {
            await createMonthMutation.mutateAsync(selectedMonth);
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
      toast({ title: "Entry added", description: "Your entry has been recorded." });
      handleCloseDayDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add entry",
        variant: "destructive",
      });
    },
  });

  const updateDayMutation = useMutation({
    mutationFn: ({ date, items }: { date: string; items: ExpenseItem[] }) =>
      api.put<DailyExpense>(`/expenses/month/${selectedMonth}/day/${date}`, {
        date,
        items,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/month", selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Entry updated", description: "Your entry has been updated." });
      handleCloseDayDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update entry",
        variant: "destructive",
      });
    },
  });

  const deleteDayMutation = useMutation({
    mutationFn: (date: string) =>
      api.delete<DailyExpense>(`/expenses/month/${selectedMonth}/day/${date}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/month", selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Day deleted", description: "The day's entries have been removed." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete day",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ date, itemId }: { date: string; itemId: string }) =>
      api.delete<DailyExpense>(`/expenses/month/${selectedMonth}/day/${date}/item/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/month", selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Item deleted", description: "The item has been removed." });
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
      items: [{ purpose: "", amount: 0, type: "expense" }],
    });
  };

  const handleEditDay = (date: string, items: ExpenseItem[]) => {
    form.reset({
      date: parse(date, "yyyy-MM-dd", new Date()),
      items: items.map((item) => ({
        purpose: item.purpose,
        amount: item.amount,
        type: (item.type as "expense" | "earning") ?? "expense",
      })),
    });
    setIsDayDialogOpen(true);
  };

  const handleSubmitDay = (data: ExpenseDayFormData) => {
    const dateStr = format(data.date, "yyyy-MM-dd");
    const existingDay = currentMonthExpense?.days.find((d) => d.date === dateStr);

    if (existingDay) {
      updateDayMutation.mutate({ date: dateStr, items: data.items as ExpenseItem[] });
    } else {
      addDayMutation.mutate(data);
    }
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    const current = parse(selectedMonth, "yyyy-MM", new Date());
    const newMonth =
      direction === "prev"
        ? format(new Date(current.getFullYear(), current.getMonth() - 1, 1), "yyyy-MM")
        : format(new Date(current.getFullYear(), current.getMonth() + 1, 1), "yyyy-MM");
    setSelectedMonth(newMonth);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);

  const formatMonthName = (month: string) =>
    format(parse(month, "yyyy-MM", new Date()), "MMMM yyyy");

  const monthlyTotal = currentMonthExpense?.monthlyTotal || 0;
  const monthlyEarnings = currentMonthExpense?.monthlyEarnings || 0;
  const salaryCredited = currentMonthExpense?.salaryCredited || 0;
  const balance = currentMonthExpense?.balance || 0;
  const balanceSBI = currentMonthExpense?.balanceSBI || 0;
  const balanceKGB = currentMonthExpense?.balanceKGB || 0;
  const balanceCash = currentMonthExpense?.balanceCash || 0;

  const totalIncome = salaryCredited + monthlyEarnings;

  // Live totals from the form for the dialog summary
  const formItems = form.watch("items");
  const formExpenseTotal = formItems.reduce(
    (sum, item) => (item.type === "expense" ? sum + (Number(item.amount) || 0) : sum),
    0
  );
  const formEarningsTotal = formItems.reduce(
    (sum, item) => (item.type === "earning" ? sum + (Number(item.amount) || 0) : sum),
    0
  );

  if (isLoading) {
    return <PageLoader />;
  }

  const sortedDays = currentMonthExpense?.days
    ? [...currentMonthExpense.days].sort((a, b) => a.date.localeCompare(b.date))
    : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-expenses-title">Daily Expenses</h1>
          <p className="text-muted-foreground">Track your monthly expenses and earnings</p>
        </div>
        <div className="flex gap-2">
          {/* Set Salary Dialog */}
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
                  <Button type="button" variant="outline" onClick={() => setIsSalaryDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateSalaryMutation.isPending} data-testid="button-submit-salary">
                    {updateSalaryMutation.isPending ? <LoadingSpinner size="sm" /> : "Update Salary"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Expense / Earning Dialog */}
          <Dialog open={isDayDialogOpen} onOpenChange={(open) => !open && handleCloseDayDialog()}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDayDialogOpen(true)} data-testid="button-add-expense">
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Daily Entry</DialogTitle>
                <DialogDescription>
                  Add expenses or earnings for a specific day in {formatMonthName(selectedMonth)}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleSubmitDay)} className="space-y-6">
                {/* Date Picker */}
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

                {/* Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Items</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ purpose: "", amount: 0, type: "expense" })}
                      data-testid="button-add-item"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  {fields.map((field, index) => {
                    const itemType = form.watch(`items.${index}.type`);
                    const isEarning = itemType === "earning";

                    return (
                      <div
                        key={field.id}
                        className={cn(
                          "flex gap-3 items-start p-3 rounded-lg border",
                          isEarning ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30" : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                        )}
                      >
                        {/* Type Toggle */}
                        <div className="flex flex-col gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => form.setValue(`items.${index}.type`, "expense")}
                            className={cn(
                              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors",
                              !isEarning
                                ? "bg-red-500 text-white"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                            title="Mark as Expense"
                          >
                            <ArrowDownCircle className="h-3 w-3" />
                            Exp
                          </button>
                          <button
                            type="button"
                            onClick={() => form.setValue(`items.${index}.type`, "earning")}
                            className={cn(
                              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors",
                              isEarning
                                ? "bg-green-500 text-white"
                                : "text-muted-foreground hover:bg-muted"
                            )}
                            title="Mark as Earning"
                          >
                            <ArrowUpCircle className="h-3 w-3" />
                            Earn
                          </button>
                        </div>

                        {/* Purpose */}
                        <div className="flex-1 space-y-1">
                          <Input
                            placeholder={isEarning ? "Source (e.g., Freelance, Bonus)" : "Purpose (e.g., Food, Travel)"}
                            {...form.register(`items.${index}.purpose`)}
                            data-testid={`input-purpose-${index}`}
                          />
                          {form.formState.errors.items?.[index]?.purpose && (
                            <p className="text-xs text-destructive">
                              {form.formState.errors.items[index]?.purpose?.message}
                            </p>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="w-32 space-y-1">
                          <Input
                            type="number"
                            placeholder="Amount"
                            {...form.register(`items.${index}.amount`, { valueAsNumber: true })}
                            data-testid={`input-amount-${index}`}
                          />
                        </div>

                        {/* Remove */}
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
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
                    <span className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1">
                      <TrendingDown className="h-4 w-4" />
                      Expenses
                    </span>
                    <span className="font-mono font-bold text-red-700 dark:text-red-400">
                      {formatCurrency(formExpenseTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg">
                    <span className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Earnings
                    </span>
                    <span className="font-mono font-bold text-green-700 dark:text-green-400">
                      {formatCurrency(formEarningsTotal)}
                    </span>
                  </div>
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
                    {addDayMutation.isPending || updateDayMutation.isPending ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      "Save Entry"
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
                <div className="flex flex-wrap justify-center gap-4 mt-2 text-sm">
                  <span className="text-muted-foreground">Salary: {formatCurrency(salaryCredited)}</span>
                  {monthlyEarnings > 0 && (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      + Earnings: {formatCurrency(monthlyEarnings)}
                    </span>
                  )}
                  <span className="text-muted-foreground">Balance: {formatCurrency(balance)}</span>
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

      {/* Monthly Stats Cards */}
      {currentMonthExpense && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-green-200 dark:border-green-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</p>
                  {monthlyEarnings > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Salary {formatCurrency(salaryCredited)} + Earnings {formatCurrency(monthlyEarnings)}
                    </p>
                  )}
                </div>
                <TrendingUp className="h-8 w-8 text-green-500 opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(monthlyTotal)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500 opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card className={balance >= 0 ? "border-blue-200 dark:border-blue-900" : "border-orange-200 dark:border-orange-900"}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className={cn("text-2xl font-bold", balance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400")}>
                    {formatCurrency(balance)}
                  </p>
                </div>
                <Wallet className={cn("h-8 w-8 opacity-60", balance >= 0 ? "text-blue-500" : "text-orange-500")} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Balance Distribution */}
      {currentMonthExpense && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Balance Distribution</CardTitle>
                <CardDescription>Total Balance: {formatCurrency(balance)}</CardDescription>
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
                      <Input id="sbi" name="sbi" type="number" placeholder="Enter SBI amount" defaultValue={balanceSBI} step="0.01" min="0" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kgb">KGB Amount</Label>
                      <Input id="kgb" name="kgb" type="number" placeholder="Enter KGB amount" defaultValue={balanceKGB} step="0.01" min="0" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cash">Cash Amount</Label>
                      <Input id="cash" name="cash" type="number" placeholder="Enter Cash amount" defaultValue={balanceCash} step="0.01" min="0" />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setIsBalanceDistributionDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updateBalanceDistributionMutation.isPending}>
                        {updateBalanceDistributionMutation.isPending ? <LoadingSpinner size="sm" /> : "Update Distribution"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "SBI", value: balanceSBI },
                { label: "KGB", value: balanceKGB },
                { label: "Cash", value: balanceCash },
              ].map(({ label, value }) => (
                <div key={label} className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{formatCurrency(value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Entries List */}
      {monthNotFound || !currentMonthExpense || sortedDays.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Wallet}
              title={monthNotFound ? "Month not created yet" : "No entries for this month"}
              description={
                monthNotFound
                  ? "Create this month by adding your first entry."
                  : "Start tracking by adding your first expense or earning."
              }
              actionLabel="Add First Entry"
              onAction={() => setIsDayDialogOpen(true)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{formatMonthName(selectedMonth)} Entries</CardTitle>
            <CardDescription>
              Expenses: {formatCurrency(monthlyTotal)} | Earnings: {formatCurrency(monthlyEarnings)} | Balance: {formatCurrency(balance)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedDays.map((day) => {
                const dayExpenses = day.items.filter((i) => (i as any).type !== "earning");
                const dayEarningItems = day.items.filter((i) => (i as any).type === "earning");
                const dayEarningsTotal = day.dayEarnings ?? 0;

                return (
                  <div
                    key={day.date}
                    className="p-4 rounded-lg border bg-card"
                    data-testid={`expense-day-${day.date}`}
                  >
                    {/* Day Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(parse(day.date, "yyyy-MM-dd", new Date()), "EEEE, MMMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {day.dayTotal > 0 && (
                            <span className="text-sm font-mono font-bold text-red-600 dark:text-red-400 block">
                              -{formatCurrency(day.dayTotal)}
                            </span>
                          )}
                          {dayEarningsTotal > 0 && (
                            <span className="text-sm font-mono font-bold text-green-600 dark:text-green-400 block">
                              +{formatCurrency(dayEarningsTotal)}
                            </span>
                          )}
                        </div>
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
                          onClick={() => setDeleteDayConfirm({ open: true, date: day.date })}
                          data-testid={`button-delete-day-${day.date}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                      {day.items.map((item, idx) => {
                        const itemId = (item as any)._id?.toString() || idx.toString();
                        const isEarning = (item as any).type === "earning";
                        return (
                          <div
                            key={itemId}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-md",
                              isEarning
                                ? "bg-green-50 dark:bg-green-950/30"
                                : "bg-red-50 dark:bg-red-950/30"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {isEarning ? (
                                <ArrowUpCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                              ) : (
                                <ArrowDownCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
                              )}
                              <span className={cn("text-sm", isEarning ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>
                                {item.purpose}: {formatCurrency(item.amount)}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setDeleteItemConfirm({ open: true, date: day.date, itemId })}
                              data-testid={`button-delete-item-${day.date}-${idx}`}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating Action Button — always reachable regardless of scroll position */}
      <button
        onClick={() => setIsDayDialogOpen(true)}
        className="fixed bottom-20 right-4 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all duration-150 sm:bottom-6"
        aria-label="Add new expense entry"
        data-testid="fab-add-expense"
      >
        <Plus className="h-6 w-6" />
      </button>

      <ConfirmationModal
        open={deleteDayConfirm.open}
        onOpenChange={(open) => setDeleteDayConfirm({ open, date: open ? deleteDayConfirm.date : null })}
        onConfirm={() => deleteDayConfirm.date && deleteDayMutation.mutate(deleteDayConfirm.date)}
        variant="delete"
        title="Delete Day Entries"
        description="Are you sure you want to delete all entries for this day? This action cannot be undone."
        isLoading={deleteDayMutation.isPending}
      />

      <ConfirmationModal
        open={deleteItemConfirm.open}
        onOpenChange={(open) =>
          setDeleteItemConfirm({ open, date: open ? deleteItemConfirm.date : null, itemId: open ? deleteItemConfirm.itemId : null })
        }
        onConfirm={() =>
          deleteItemConfirm.date && deleteItemConfirm.itemId &&
          deleteItemMutation.mutate({ date: deleteItemConfirm.date, itemId: deleteItemConfirm.itemId })
        }
        variant="delete"
        title="Delete Item"
        description="Are you sure you want to delete this item? This action cannot be undone."
        isLoading={deleteItemMutation.isPending}
      />
    </div>
  );
}
