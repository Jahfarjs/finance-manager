import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parse, addMonths } from "date-fns";
import { Plus, CreditCard, ChevronDown, ChevronUp, Trash2, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { PageLoader, LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { EMI } from "@shared/schema";

const emiFormSchema = z.object({
  emiTitle: z.string().min(1, "Title is required"),
  startMonth: z.string().min(1, "Start month is required"),
  emiAmountPerMonth: z.number().min(1, "Amount must be at least 1"),
  emiDuration: z.number().min(1, "Duration must be at least 1 month"),
});

type EMIFormData = z.infer<typeof emiFormSchema>;

export default function EMIPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedEmi, setExpandedEmi] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: emis, isLoading } = useQuery({
    queryKey: ["/api/emis"],
    queryFn: () => api.get<EMI[]>("/emis"),
  });

  const form = useForm<EMIFormData>({
    resolver: zodResolver(emiFormSchema),
    defaultValues: {
      emiTitle: "",
      startMonth: format(new Date(), "yyyy-MM"),
      emiAmountPerMonth: 0,
      emiDuration: 12,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: EMIFormData) => api.post<EMI>("/emis", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "EMI added", description: "Your EMI has been created with a payment schedule." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create EMI",
        variant: "destructive",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ emiId, monthIndex }: { emiId: string; monthIndex: number }) =>
      api.patch<EMI>(`/emis/${emiId}/schedule/${monthIndex}`, { status: "paid" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Payment marked", description: "EMI payment marked as paid." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update payment",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/emis/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "EMI deleted", description: "The EMI has been removed." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete EMI",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    form.reset();
  };

  const handleSubmit = (data: EMIFormData) => {
    createMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressPercentage = (emi: EMI) => {
    const paidCount = emi.emiSchedule.filter((s) => s.status === "paid").length;
    return (paidCount / emi.emiSchedule.length) * 100;
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-emi-title">EMI Management</h1>
          <p className="text-muted-foreground">Track and manage your EMI payments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-emi">
              <Plus className="h-4 w-4 mr-2" />
              Add EMI
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New EMI</DialogTitle>
              <DialogDescription>
                Create an EMI with automatic monthly payment schedule
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emiTitle">EMI Title</Label>
                <Input
                  id="emiTitle"
                  placeholder="e.g., Car Loan, Home Loan"
                  {...form.register("emiTitle")}
                  data-testid="input-emi-title"
                />
                {form.formState.errors.emiTitle && (
                  <p className="text-sm text-destructive">{form.formState.errors.emiTitle.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="startMonth">Start Month</Label>
                <Input
                  id="startMonth"
                  type="month"
                  {...form.register("startMonth")}
                  data-testid="input-start-month"
                />
                {form.formState.errors.startMonth && (
                  <p className="text-sm text-destructive">{form.formState.errors.startMonth.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emiAmountPerMonth">Monthly Amount</Label>
                  <Input
                    id="emiAmountPerMonth"
                    type="number"
                    placeholder="10000"
                    {...form.register("emiAmountPerMonth", { valueAsNumber: true })}
                    data-testid="input-emi-amount"
                  />
                  {form.formState.errors.emiAmountPerMonth && (
                    <p className="text-sm text-destructive">{form.formState.errors.emiAmountPerMonth.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emiDuration">Duration (months)</Label>
                  <Input
                    id="emiDuration"
                    type="number"
                    placeholder="12"
                    {...form.register("emiDuration", { valueAsNumber: true })}
                    data-testid="input-emi-duration"
                  />
                  {form.formState.errors.emiDuration && (
                    <p className="text-sm text-destructive">{form.formState.errors.emiDuration.message}</p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Total Amount</span>
                  <span className="font-mono font-bold">
                    {formatCurrency(
                      (form.watch("emiAmountPerMonth") || 0) * (form.watch("emiDuration") || 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-emi">
                  {createMutation.isPending ? <LoadingSpinner size="sm" /> : "Create EMI"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!emis || emis.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={CreditCard}
              title="No EMIs yet"
              description="Add your EMIs to track monthly payments and remaining amounts automatically."
              actionLabel="Add First EMI"
              onAction={() => setIsDialogOpen(true)}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {emis.map((emi) => (
            <Card key={emi.id}>
              <Collapsible
                open={expandedEmi === emi.id}
                onOpenChange={() => setExpandedEmi(expandedEmi === emi.id ? null : emi.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        {emi.emiTitle}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {formatCurrency(emi.emiAmountPerMonth)}/month for {emi.emiDuration} months
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(emi.id);
                        }}
                        data-testid={`button-delete-emi-${emi.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-expand-emi-${emi.id}`}>
                          {expandedEmi === emi.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {emi.emiSchedule.filter((s) => s.status === "paid").length} of {emi.emiSchedule.length} paid
                      </span>
                    </div>
                    <Progress value={getProgressPercentage(emi)} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-mono font-bold">{formatCurrency(emi.totalAmount)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="text-lg font-mono font-bold text-primary">
                        {formatCurrency(emi.remainingAmount)}
                      </p>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="mt-4 rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {emi.emiSchedule.map((schedule, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {format(parse(schedule.month, "yyyy-MM", new Date()), "MMM yyyy")}
                              </TableCell>
                              <TableCell className="font-mono">
                                {formatCurrency(schedule.amount)}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={schedule.status} />
                              </TableCell>
                              <TableCell className="text-right">
                                {schedule.status === "unpaid" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      updateScheduleMutation.mutate({ emiId: emi.id, monthIndex: index })
                                    }
                                    disabled={updateScheduleMutation.isPending}
                                    data-testid={`button-mark-paid-${emi.id}-${index}`}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Mark Paid
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
