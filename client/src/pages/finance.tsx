import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, TrendingUp, TrendingDown, ArrowLeftRight, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { PageLoader, LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { Finance } from "@shared/schema";

const financeFormSchema = z.object({
  type: z.enum(["debit", "credit"]),
  person: z.string().min(1, "Person name is required"),
  amount: z.number().min(0, "Amount must be positive"),
});

type FinanceFormData = z.infer<typeof financeFormSchema>;

export default function FinancePage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: finance, isLoading } = useQuery({
    queryKey: ["/api/finance"],
    queryFn: () => api.get<Finance>("/finance"),
  });

  const form = useForm<FinanceFormData>({
    resolver: zodResolver(financeFormSchema),
    defaultValues: { type: "debit", person: "", amount: 0 },
  });

  const addEntryMutation = useMutation({
    mutationFn: (data: FinanceFormData) => api.post<Finance>("/finance/entry", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Entry added", description: "Finance entry has been recorded." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add entry",
        variant: "destructive",
      });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: ({ type, index }: { type: "debit" | "credit"; index: number }) =>
      api.delete(`/finance/entry/${type}/${index}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Entry deleted", description: "The entry has been removed." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete entry",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    form.reset();
  };

  const handleSubmit = (data: FinanceFormData) => {
    addEntryMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  const hasData = finance && (finance.debitList.length > 0 || finance.creditList.length > 0);
  const netBalance = (finance?.totalCredit || 0) - (finance?.totalDebit || 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-finance-title">Finance Management</h1>
          <p className="text-muted-foreground">Track money you owe and money owed to you</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-entry">
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Finance Entry</DialogTitle>
              <DialogDescription>
                Record a debit (money you owe) or credit (money owed to you)
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.watch("type")}
                  onValueChange={(value: "debit" | "credit") => form.setValue("type", value)}
                >
                  <SelectTrigger data-testid="select-entry-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Debit (You Owe)</SelectItem>
                    <SelectItem value="credit">Credit (Owed to You)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="person">Person Name</Label>
                <Input
                  id="person"
                  placeholder="Enter person's name"
                  {...form.register("person")}
                  data-testid="input-person"
                />
                {form.formState.errors.person && (
                  <p className="text-sm text-destructive">{form.formState.errors.person.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  {...form.register("amount", { valueAsNumber: true })}
                  data-testid="input-amount"
                />
                {form.formState.errors.amount && (
                  <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addEntryMutation.isPending} data-testid="button-submit-entry">
                  {addEntryMutation.isPending ? <LoadingSpinner size="sm" /> : "Add Entry"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Credit"
          value={formatCurrency(finance?.totalCredit || 0)}
          icon={TrendingUp}
          description="Money to receive"
        />
        <StatCard
          title="Total Debit"
          value={formatCurrency(finance?.totalDebit || 0)}
          icon={TrendingDown}
          description="Money to pay"
        />
        <StatCard
          title="Net Balance"
          value={formatCurrency(netBalance)}
          icon={ArrowLeftRight}
          description={netBalance >= 0 ? "You're ahead" : "You owe more"}
        />
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={ArrowLeftRight}
              title="No entries yet"
              description="Start tracking money you owe and money owed to you."
              actionLabel="Add First Entry"
              onAction={() => setIsDialogOpen(true)}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                Debit (You Owe)
              </CardTitle>
              <CardDescription>Money you need to pay back</CardDescription>
            </CardHeader>
            <CardContent>
              {!finance?.debitList.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No debit entries. You don't owe anyone!
                </p>
              ) : (
                <div className="space-y-3">
                  {finance.debitList.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      data-testid={`debit-entry-${index}`}
                    >
                      <div>
                        <span className="font-medium">{entry.person}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-destructive">
                          {formatCurrency(entry.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteEntryMutation.mutate({ type: "debit", index })}
                          data-testid={`button-delete-debit-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between p-3 rounded-lg bg-muted font-medium">
                    <span>Total Debit</span>
                    <span className="font-mono">{formatCurrency(finance.totalDebit)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Credit (Owed to You)
              </CardTitle>
              <CardDescription>Money you need to collect</CardDescription>
            </CardHeader>
            <CardContent>
              {!finance?.creditList.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No credit entries. No one owes you money!
                </p>
              ) : (
                <div className="space-y-3">
                  {finance.creditList.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      data-testid={`credit-entry-${index}`}
                    >
                      <div>
                        <span className="font-medium">{entry.person}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-primary">
                          {formatCurrency(entry.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteEntryMutation.mutate({ type: "credit", index })}
                          data-testid={`button-delete-credit-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between p-3 rounded-lg bg-muted font-medium">
                    <span>Total Credit</span>
                    <span className="font-mono">{formatCurrency(finance.totalCredit)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
