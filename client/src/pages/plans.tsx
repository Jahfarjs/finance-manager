import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calendar, Trash2, CheckCircle, XCircle, Edit2, CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { PageLoader, LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { Plan } from "@shared/schema";

const planFormSchema = z.object({
  planDescription: z.string().min(1, "Description is required"),
  date: z.string().optional(),
});

type PlanFormData = z.infer<typeof planFormSchema>;

export default function PlansPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["/api/plans"],
    queryFn: () => api.get<Plan[]>("/plans"),
  });

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: { planDescription: "", date: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: PlanFormData) => api.post<Plan>("/plans", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({ title: "Plan added", description: "Your plan has been created." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create plan",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: PlanFormData) =>
      api.put<Plan>(`/plans/${selectedPlan?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({ title: "Plan updated", description: "Your plan has been updated." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update plan",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "worked" | "not_worked" }) =>
      api.patch<Plan>(`/plans/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update plan",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({ title: "Plan deleted", description: "The plan has been removed." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete plan",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedPlan(null);
    form.reset({ planDescription: "", date: "" });
  };

  const handleEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    form.reset({ planDescription: plan.planDescription, date: plan.date || "" });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: PlanFormData) => {
    if (selectedPlan) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleToggleStatus = (plan: Plan) => {
    const newStatus = plan.status === "worked" ? "not_worked" : "worked";
    toggleMutation.mutate({ id: plan.id, status: newStatus });
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-plans-title">Plans</h1>
          <p className="text-muted-foreground">Plan events, dates, and ideas</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-plan">
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedPlan ? "Edit Plan" : "Add New Plan"}</DialogTitle>
              <DialogDescription>
                {selectedPlan ? "Update your plan details" : "Create a new plan or idea to track"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="planDescription">Description</Label>
                <Textarea
                  id="planDescription"
                  placeholder="Describe your plan or idea..."
                  rows={4}
                  {...form.register("planDescription")}
                  data-testid="input-plan-description"
                />
                {form.formState.errors.planDescription && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.planDescription.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Reminder Date (Optional)</Label>
                <Input
                  id="date"
                  type="date"
                  {...form.register("date")}
                  data-testid="input-plan-date"
                />
                {form.formState.errors.date && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-plan"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <LoadingSpinner size="sm" />
                  ) : selectedPlan ? (
                    "Update Plan"
                  ) : (
                    "Add Plan"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!plans || plans.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Calendar}
              title="No plans yet"
              description="Start planning your events, dates, and ideas to stay organized."
              actionLabel="Add First Plan"
              onAction={() => setIsDialogOpen(true)}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col" data-testid={`plan-card-${plan.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <StatusBadge status={plan.status} />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(plan)}
                      data-testid={`button-edit-plan-${plan.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(plan.id)}
                      data-testid={`button-delete-plan-${plan.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm flex-1 whitespace-pre-wrap">{plan.planDescription}</p>
                {plan.date && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    <span>{new Date(plan.date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Toggle status</span>
                  <Button
                    variant={plan.status === "worked" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleStatus(plan)}
                    data-testid={`button-toggle-plan-${plan.id}`}
                  >
                    {plan.status === "worked" ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Worked
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-1" />
                        Not Worked
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
