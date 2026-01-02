import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Target, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/EmptyState";
import { PageLoader, LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { Goal } from "@shared/schema";

const goalFormSchema = z.object({
  goalName: z.string().min(1, "Goal name is required"),
});

type GoalFormData = z.infer<typeof goalFormSchema>;

export default function GoalsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: goals, isLoading } = useQuery({
    queryKey: ["/api/goals"],
    queryFn: () => api.get<Goal[]>("/goals"),
  });

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: { goalName: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: GoalFormData) => api.post<Goal>("/goals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Goal added", description: "Your goal has been created." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create goal",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "pending" | "completed" }) =>
      api.patch<Goal>(`/goals/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update goal",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Goal deleted", description: "The goal has been removed." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete goal",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    form.reset();
  };

  const handleSubmit = (data: GoalFormData) => {
    createMutation.mutate(data);
  };

  const handleToggle = (goal: Goal) => {
    const newStatus = goal.status === "pending" ? "completed" : "pending";
    toggleMutation.mutate({ id: goal.id, status: newStatus });
  };

  if (isLoading) {
    return <PageLoader />;
  }

  const pendingGoals = goals?.filter((g) => g.status === "pending") || [];
  const completedGoals = goals?.filter((g) => g.status === "completed") || [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-goals-title">Monthly Goals</h1>
          <p className="text-muted-foreground">Set and track your monthly goals</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-goal">
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Goal</DialogTitle>
              <DialogDescription>
                Create a new goal to track this month
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goalName">Goal Name</Label>
                <Input
                  id="goalName"
                  placeholder="e.g., Save 5000 rupees"
                  {...form.register("goalName")}
                  data-testid="input-goal-name"
                />
                {form.formState.errors.goalName && (
                  <p className="text-sm text-destructive">{form.formState.errors.goalName.message}</p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-goal">
                  {createMutation.isPending ? <LoadingSpinner size="sm" /> : "Add Goal"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-3 bg-muted/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 px-1">
            <Circle className="h-4 w-4" />
            Pending ({pendingGoals.length})
          </div>
        </Card>
        <Card className="p-3 bg-muted/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 px-1">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Completed ({completedGoals.length})
          </div>
        </Card>
      </div>

      {!goals || goals.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Target}
              title="No goals yet"
              description="Start setting monthly goals to track your progress and achievements."
              actionLabel="Add First Goal"
              onAction={() => setIsDialogOpen(true)}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Circle className="h-5 w-5" />
                Pending Goals
              </CardTitle>
              <CardDescription>Goals you're working on</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No pending goals. All caught up!
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      data-testid={`goal-item-${goal.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Switch
                          checked={false}
                          onCheckedChange={() => handleToggle(goal)}
                          data-testid={`switch-goal-${goal.id}`}
                        />
                        <span className="font-medium">{goal.goalName}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(goal.id)}
                        data-testid={`button-delete-goal-${goal.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Completed Goals
              </CardTitle>
              <CardDescription>Goals you've achieved</CardDescription>
            </CardHeader>
            <CardContent>
              {completedGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Complete your first goal to see it here!
                </p>
              ) : (
                <div className="space-y-3">
                  {completedGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                      data-testid={`goal-item-${goal.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Switch
                          checked={true}
                          onCheckedChange={() => handleToggle(goal)}
                          data-testid={`switch-goal-${goal.id}`}
                        />
                        <span className="font-medium line-through text-muted-foreground">
                          {goal.goalName}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(goal.id)}
                        data-testid={`button-delete-goal-${goal.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
