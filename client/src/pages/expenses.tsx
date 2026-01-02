import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Trash2, Wallet, Calendar, DollarSign } from "lucide-react";
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
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { DailyExpense } from "@shared/schema";

const expenseFormSchema = z.object({
  date: z.date(),
  salaryCredited: z.number().min(0).optional(),
  expenses: z.array(
    z.object({
      purpose: z.string().min(1, "Purpose is required"),
      amount: z.number().min(0, "Amount must be positive"),
    })
  ).min(1, "At least one expense is required"),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

export default function ExpensesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<DailyExpense | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["/api/expenses"],
    queryFn: () => api.get<DailyExpense[]>("/expenses"),
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: new Date(),
      salaryCredited: 0,
      expenses: [{ purpose: "", amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "expenses",
  });

  const createMutation = useMutation({
    mutationFn: (data: ExpenseFormData) =>
      api.post<DailyExpense>("/expenses", {
        date: format(data.date, "yyyy-MM-dd"),
        expenses: data.expenses,
        salaryCredited: data.salaryCredited,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Expense added", description: "Your expense has been recorded." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ExpenseFormData) =>
      api.put<DailyExpense>(`/expenses/${selectedExpense?.id}`, {
        date: format(data.date, "yyyy-MM-dd"),
        expenses: data.expenses,
        salaryCredited: data.salaryCredited,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Expense updated", description: "Your expense has been updated." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update expense",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Expense deleted", description: "The expense has been removed." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedExpense(null);
    form.reset({
      date: new Date(),
      salaryCredited: 0,
      expenses: [{ purpose: "", amount: 0 }],
    });
  };

  const handleEdit = (expense: DailyExpense) => {
    setSelectedExpense(expense);
    form.reset({
      date: new Date(expense.date),
      salaryCredited: expense.salaryCredited,
      expenses: expense.expenses,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: ExpenseFormData) => {
    if (selectedExpense) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const currentTotal = form.watch("expenses").reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  const grandTotal = expenses?.reduce((sum, exp) => sum + exp.total, 0) || 0;
  const totalSalary = expenses?.reduce((sum, exp) => sum + (exp.salaryCredited || 0), 0) || 0;
  const balance = totalSalary - grandTotal;

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-expenses-title">Daily Expenses</h1>
          <p className="text-muted-foreground">Track and manage your daily spending</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-expense">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
              <DialogDescription>
                {selectedExpense ? "Update your expense details" : "Record your expenses for a specific date"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
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
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Salary Credited (Optional)</Label>
                  <Input
                    id="salary"
                    type="number"
                    placeholder="Enter salary amount"
                    {...form.register("salaryCredited", { valueAsNumber: true })}
                    data-testid="input-salary"
                  />
                </div>
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
                        {...form.register(`expenses.${index}.purpose`)}
                        data-testid={`input-purpose-${index}`}
                      />
                      {form.formState.errors.expenses?.[index]?.purpose && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.expenses[index]?.purpose?.message}
                        </p>
                      )}
                    </div>
                    <div className="w-32 space-y-1">
                      <Input
                        type="number"
                        placeholder="Amount"
                        {...form.register(`expenses.${index}.amount`, { valueAsNumber: true })}
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
                <span className="text-xl font-mono font-bold">{formatCurrency(currentTotal)}</span>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-expense"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <LoadingSpinner size="sm" />
                  ) : selectedExpense ? (
                    "Update Expense"
                  ) : (
                    "Add Expense"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Grand Total"
          value={formatCurrency(grandTotal)}
          icon={Wallet}
          description="All expenses combined"
        />
        <StatCard
          title="Total Salary"
          value={formatCurrency(totalSalary)}
          icon={DollarSign}
          description="Income credited"
        />
        <StatCard
          title="Balance"
          value={formatCurrency(balance)}
          icon={Calendar}
          description="Salary minus expenses"
        />
      </div>

      {!expenses || expenses.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Wallet}
              title="No expenses yet"
              description="Start tracking your daily expenses to get insights into your spending habits."
              actionLabel="Add First Expense"
              onAction={() => setIsDialogOpen(true)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Expense History</CardTitle>
            <CardDescription>Your recorded daily expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="p-4 rounded-lg border bg-card hover-elevate cursor-pointer"
                  onClick={() => handleEdit(expense)}
                  data-testid={`expense-row-${expense.id}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {new Date(expense.date).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-bold text-primary">
                        {formatCurrency(expense.total)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(expense.id);
                        }}
                        data-testid={`button-delete-expense-${expense.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {expense.expenses.map((item, idx) => (
                      <span
                        key={idx}
                        className="text-sm px-2 py-1 rounded-md bg-muted"
                      >
                        {item.purpose}: {formatCurrency(item.amount)}
                      </span>
                    ))}
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
