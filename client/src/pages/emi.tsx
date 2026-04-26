import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parse } from "date-fns";
import { Plus, CreditCard, ChevronDown, ChevronUp, Trash2, Check, Edit2, Landmark, IndianRupee } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  startMonth: z.string().min(1, "Start date is required"),
  paymentFrequency: z.enum(["monthly", "weekly", "twice_monthly", "custom"]),
  customIntervalDays: z.number().optional(),
  emiAmountPerMonth: z.number().min(1, "Amount must be at least 1"),
  emiDuration: z.number().min(1, "Must be at least 1"),
  isKuri: z.boolean(),
});

type EMIFormData = z.infer<typeof emiFormSchema>;

const frequencyLabels: Record<string, string> = {
  monthly: "Monthly",
  weekly: "Weekly",
  twice_monthly: "Twice/Month",
  custom: "Custom",
};

const frequencyBadgeColors: Record<string, string> = {
  monthly: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  weekly: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  twice_monthly: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  custom: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
};

function formatScheduleDate(dateStr: string): string {
  // Handle both YYYY-MM and YYYY-MM-DD formats
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    return format(parse(dateStr, "yyyy-MM", new Date()), "MMM yyyy");
  }
  return format(parse(dateStr, "yyyy-MM-dd", new Date()), "dd MMM yyyy");
}

export default function EMIPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmi, setSelectedEmi] = useState<EMI | null>(null);
  const [expandedEmi, setExpandedEmi] = useState<string | null>(null);
  const [kuriDialogEmi, setKuriDialogEmi] = useState<EMI | null>(null);
  const [kuriAmount, setKuriAmount] = useState("");
  const [kuriDate, setKuriDate] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "emi" | "kuri">("all");
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
      paymentFrequency: "monthly",
      customIntervalDays: 30,
      emiAmountPerMonth: 0,
      emiDuration: 12,
      isKuri: false,
    },
  });

  const watchFrequency = form.watch("paymentFrequency");
  const watchIsKuri = form.watch("isKuri");

  const createMutation = useMutation({
    mutationFn: (data: EMIFormData) => {
      const payload: any = { ...data };
      // For non-monthly, convert month input to date format
      if (data.paymentFrequency !== "monthly" && /^\d{4}-\d{2}$/.test(data.startMonth)) {
        payload.startMonth = data.startMonth + "-01";
      }
      if (data.paymentFrequency !== "custom") {
        delete payload.customIntervalDays;
      }
      return api.post<EMI>("/emis", payload);
    },
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

  const updateMutation = useMutation({
    mutationFn: (data: { id: string } & EMIFormData) => {
      const { id, ...rest } = data;
      const payload: any = { ...rest };
      if (rest.paymentFrequency !== "monthly" && /^\d{4}-\d{2}$/.test(rest.startMonth)) {
        payload.startMonth = rest.startMonth + "-01";
      }
      if (rest.paymentFrequency !== "custom") {
        delete payload.customIntervalDays;
      }
      return api.put<EMI>(`/emis/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emis"] });
      toast({ title: "EMI updated", description: "Your EMI has been updated." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update EMI",
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
      toast({ title: "Payment marked", description: "Payment marked as paid." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update payment",
        variant: "destructive",
      });
    },
  });

  const kuriMutation = useMutation({
    mutationFn: ({ id, amount, date }: { id: string; amount: number; date?: string }) =>
      api.patch<EMI>(`/emis/${id}/kuri`, { amount, date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emis"] });
      toast({ title: "Kuri updated", description: "Kuri received amount has been updated." });
      setKuriDialogEmi(null);
      setKuriAmount("");
      setKuriDate("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update kuri",
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
    setSelectedEmi(null);
    form.reset({
      emiTitle: "",
      startMonth: format(new Date(), "yyyy-MM"),
      paymentFrequency: "monthly",
      customIntervalDays: 30,
      emiAmountPerMonth: 0,
      emiDuration: 12,
      isKuri: false,
    });
  };

  const handleEdit = (emi: EMI) => {
    setSelectedEmi(emi);
    form.reset({
      emiTitle: emi.emiTitle,
      startMonth: emi.startMonth,
      paymentFrequency: emi.paymentFrequency || "monthly",
      customIntervalDays: emi.customIntervalDays || 30,
      emiAmountPerMonth: emi.emiAmountPerMonth,
      emiDuration: emi.emiDuration,
      isKuri: emi.isKuri || false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: EMIFormData) => {
    if (selectedEmi) {
      updateMutation.mutate({ id: selectedEmi.id, ...data });
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

  const getProgressPercentage = (emi: EMI) => {
    const paidCount = emi.emiSchedule.filter((s) => s.status === "paid").length;
    return (paidCount / emi.emiSchedule.length) * 100;
  };

  const getPaidAmount = (emi: EMI) => {
    return emi.emiSchedule
      .filter((s) => s.status === "paid")
      .reduce((sum, s) => sum + s.amount, 0);
  };

  const getDurationLabel = (freq: string) => {
    switch (freq) {
      case "weekly": return "weeks";
      case "twice_monthly": return "payments";
      case "custom": return "payments";
      default: return "months";
    }
  };

  const getFrequencyDescription = (emi: EMI) => {
    const freq = emi.paymentFrequency || "monthly";
    switch (freq) {
      case "weekly": return `${formatCurrency(emi.emiAmountPerMonth)}/week for ${emi.emiDuration} weeks`;
      case "twice_monthly": return `${formatCurrency(emi.emiAmountPerMonth)} twice/month, ${emi.emiDuration} payments`;
      case "custom": return `${formatCurrency(emi.emiAmountPerMonth)} every ${emi.customIntervalDays} days, ${emi.emiDuration} payments`;
      default: return `${formatCurrency(emi.emiAmountPerMonth)}/month for ${emi.emiDuration} months`;
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  const filteredEmis = emis?.filter((emi) => {
    if (activeTab === "emi") return !emi.isKuri;
    if (activeTab === "kuri") return emi.isKuri;
    return true;
  }) || [];

  const emiCount = emis?.filter((e) => !e.isKuri).length || 0;
  const kuriCount = emis?.filter((e) => e.isKuri).length || 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-emi-title">EMI & Kuri</h1>
          <p className="text-muted-foreground">Track EMI payments and Kuri (Chit Fund) contributions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-emi">
              <Plus className="h-4 w-4 mr-2" />
              Add EMI / Kuri
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedEmi ? "Edit EMI" : "Add New EMI / Kuri"}</DialogTitle>
              <DialogDescription>
                {selectedEmi ? "Update your EMI / Kuri details. Payment schedule will be regenerated." : "Create an EMI or Kuri with custom payment schedule"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emiTitle">Title</Label>
                <Input
                  id="emiTitle"
                  placeholder="e.g., Car Loan, Home Loan, Kuri"
                  {...form.register("emiTitle")}
                  data-testid="input-emi-title"
                />
                {form.formState.errors.emiTitle && (
                  <p className="text-sm text-destructive">{form.formState.errors.emiTitle.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Landmark className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Kuri (Chit Fund)</p>
                    <p className="text-xs text-muted-foreground">Enable if this is a chit fund deposit</p>
                  </div>
                </div>
                <Switch
                  checked={watchIsKuri}
                  onCheckedChange={(checked) => form.setValue("isKuri", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Frequency</Label>
                <Select
                  value={watchFrequency}
                  onValueChange={(value) => form.setValue("paymentFrequency", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="twice_monthly">Twice in a Month</SelectItem>
                    <SelectItem value="custom">Custom Interval</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {watchFrequency === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="customIntervalDays">Interval (days)</Label>
                  <Input
                    id="customIntervalDays"
                    type="number"
                    placeholder="e.g., 15"
                    {...form.register("customIntervalDays", { valueAsNumber: true })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="startMonth">
                  {watchFrequency === "monthly" ? "Start Month" : "Start Date"}
                </Label>
                <Input
                  id="startMonth"
                  type={watchFrequency === "monthly" ? "month" : "date"}
                  {...form.register("startMonth")}
                  data-testid="input-start-month"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emiAmountPerMonth">Amount per Payment</Label>
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
                  <Label htmlFor="emiDuration">No. of Installments</Label>
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

              <div className="p-4 bg-muted rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Total Amount</span>
                  <span className="font-mono font-bold">
                    {formatCurrency(
                      (form.watch("emiAmountPerMonth") || 0) * (form.watch("emiDuration") || 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Frequency</span>
                  <span>{frequencyLabels[watchFrequency]}</span>
                </div>
                {watchIsKuri && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Type</span>
                    <span>Kuri (Chit Fund)</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-emi">
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <LoadingSpinner size="sm" />
                  ) : selectedEmi ? (
                    "Update EMI"
                  ) : (
                    watchIsKuri ? "Create Kuri" : "Create EMI"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tab Filter */}
      {emis && emis.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("all")}
          >
            All ({emis.length})
          </Button>
          <Button
            variant={activeTab === "emi" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("emi")}
          >
            <CreditCard className="h-4 w-4 mr-1" />
            EMI ({emiCount})
          </Button>
          <Button
            variant={activeTab === "kuri" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("kuri")}
          >
            <Landmark className="h-4 w-4 mr-1" />
            Kuri ({kuriCount})
          </Button>
        </div>
      )}

      {/* Kuri Received Dialog */}
      <Dialog open={!!kuriDialogEmi} onOpenChange={(open) => !open && setKuriDialogEmi(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Kuri Payout</DialogTitle>
            <DialogDescription>
              Record the amount received from {kuriDialogEmi?.emiTitle}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {kuriDialogEmi && (
              <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Total Kuri Amount</span>
                  <span className="font-mono font-bold">{formatCurrency(kuriDialogEmi.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid So Far</span>
                  <span className="font-mono">{formatCurrency(getPaidAmount(kuriDialogEmi))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Currently Received</span>
                  <span className="font-mono">{formatCurrency(kuriDialogEmi.kuriReceivedAmount || 0)}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Received Amount</Label>
              <Input
                type="number"
                placeholder="Enter received amount"
                value={kuriAmount}
                onChange={(e) => setKuriAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Received Date (Optional)</Label>
              <Input
                type="date"
                value={kuriDate}
                onChange={(e) => setKuriDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setKuriDialogEmi(null)}>Cancel</Button>
              <Button
                disabled={kuriMutation.isPending || !kuriAmount}
                onClick={() => {
                  if (kuriDialogEmi && kuriAmount) {
                    kuriMutation.mutate({
                      id: kuriDialogEmi.id,
                      amount: Number(kuriAmount),
                      date: kuriDate || undefined,
                    });
                  }
                }}
              >
                {kuriMutation.isPending ? <LoadingSpinner size="sm" /> : "Update Payout"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {!emis || emis.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={CreditCard}
              title="No EMIs or Kuris yet"
              description="Add your EMIs or Kuri payments to track schedules and remaining amounts."
              actionLabel="Add First EMI / Kuri"
              onAction={() => setIsDialogOpen(true)}
            />
          </CardContent>
        </Card>
      ) : filteredEmis.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No {activeTab === "kuri" ? "Kuris" : "EMIs"} found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEmis.map((emi) => {
            const freq = emi.paymentFrequency || "monthly";
            const isKuri = emi.isKuri || false;
            const paidAmount = getPaidAmount(emi);
            const kuriBalance = isKuri ? emi.totalAmount - (emi.kuriReceivedAmount || 0) : 0;

            return (
              <Card key={emi.id} className={isKuri ? "border-l-4 border-l-primary" : ""}>
                <Collapsible
                  open={expandedEmi === emi.id}
                  onOpenChange={() => setExpandedEmi(expandedEmi === emi.id ? null : emi.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 flex-wrap">
                          {isKuri ? (
                            <Landmark className="h-5 w-5 text-primary" />
                          ) : (
                            <CreditCard className="h-5 w-5 text-primary" />
                          )}
                          {emi.emiTitle}
                          <Badge variant="secondary" className={frequencyBadgeColors[freq]}>
                            {frequencyLabels[freq]}
                          </Badge>
                          {isKuri && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary">
                              Kuri
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {getFrequencyDescription(emi)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); handleEdit(emi); }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {isKuri && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setKuriDialogEmi(emi);
                              setKuriAmount(String(emi.kuriReceivedAmount || 0));
                              setKuriDate(emi.kuriReceivedDate || "");
                            }}
                            title="Update Kuri Payout"
                          >
                            <IndianRupee className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(emi.id); }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon">
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

                    <div className={`grid gap-4 ${isKuri ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2"}`}>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Total Amount</p>
                        <p className="text-lg font-mono font-bold">{formatCurrency(emi.totalAmount)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">
                          {isKuri ? "Paid So Far" : "Remaining"}
                        </p>
                        <p className="text-lg font-mono font-bold text-primary">
                          {isKuri ? formatCurrency(paidAmount) : formatCurrency(emi.remainingAmount)}
                        </p>
                      </div>
                      {isKuri && (
                        <>
                          <div className="p-3 rounded-lg bg-muted">
                            <p className="text-xs text-muted-foreground">Received Back</p>
                            <p className="text-lg font-mono font-bold text-green-600">
                              {formatCurrency(emi.kuriReceivedAmount || 0)}
                            </p>
                            {emi.kuriReceivedDate && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                on {format(new Date(emi.kuriReceivedDate), "dd MMM yyyy")}
                              </p>
                            )}
                          </div>
                          <div className="p-3 rounded-lg bg-muted">
                            <p className="text-xs text-muted-foreground">Balance to Receive</p>
                            <p className={`text-lg font-mono font-bold ${kuriBalance > 0 ? "text-orange-500" : "text-green-600"}`}>
                              {formatCurrency(kuriBalance)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <CollapsibleContent>
                      <div className="mt-4 rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {emi.emiSchedule.map((schedule, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {formatScheduleDate((schedule as any).date || (schedule as any).month)}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
