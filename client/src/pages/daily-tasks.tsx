import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  ClipboardCheck,
  Trash2,
  Edit2,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { PageLoader, LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { DailyTask } from "@shared/schema";

const taskFormSchema = z.object({
  taskName: z.string().min(1, "Task name is required"),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required"),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = [];
  const day = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((day + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getMonthDates(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    dates.push(new Date(year, month, i));
  }
  return dates;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

const frequencyLabels = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const frequencyColors = {
  daily: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  weekly: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  monthly: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

export default function DailyTasksPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/daily-tasks"],
    queryFn: () => api.get<DailyTask[]>("/daily-tasks"),
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      taskName: "",
      frequency: "daily",
      startDate: new Date().toISOString().split("T")[0],
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: TaskFormData) => api.post<DailyTask>("/daily-tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks"] });
      toast({ title: "Task added", description: "Your task has been created." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: TaskFormData) =>
      api.put<DailyTask>(`/daily-tasks/${selectedTask?.id}`, {
        taskName: data.taskName,
        frequency: data.frequency,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks"] });
      toast({ title: "Task updated", description: "Your task has been updated." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ taskId, date }: { taskId: string; date: string }) =>
      api.patch<DailyTask>(`/daily-tasks/${taskId}/toggle`, { date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to toggle task",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/daily-tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tasks"] });
      toast({ title: "Task deleted", description: "The task has been removed." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTask(null);
    form.reset({
      taskName: "",
      frequency: "daily",
      startDate: new Date().toISOString().split("T")[0],
    });
  };

  const handleEdit = (task: DailyTask) => {
    setSelectedTask(task);
    form.reset({
      taskName: task.taskName,
      frequency: task.frequency,
      startDate: task.startDate,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: TaskFormData) => {
    if (selectedTask) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Navigation
  const navigateWeek = (direction: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + direction * 7);
    setCurrentDate(d);
  };

  const navigateMonth = (direction: number) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + direction);
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  if (isLoading) {
    return <PageLoader />;
  }

  const weekDates = getWeekDates(currentDate);
  const monthDates = getMonthDates(currentDate.getFullYear(), currentDate.getMonth());
  const todayKey = formatDateKey(new Date());

  const dailyTasks = tasks?.filter((t) => t.frequency === "daily") || [];
  const weeklyTasks = tasks?.filter((t) => t.frequency === "weekly") || [];
  const monthlyTasks = tasks?.filter((t) => t.frequency === "monthly") || [];

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Daily Task Sheet</h1>
          <p className="text-muted-foreground">
            Track your daily, weekly, and monthly tasks
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => !open && handleCloseDialog()}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedTask ? "Edit Task" : "Add New Task"}
              </DialogTitle>
              <DialogDescription>
                {selectedTask
                  ? "Update your task details"
                  : "Create a recurring task to track"}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="taskName">Task Name</Label>
                <Input
                  id="taskName"
                  placeholder="e.g., Save 200 rupees, Exercise, Read 10 pages"
                  {...form.register("taskName")}
                />
                {form.formState.errors.taskName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.taskName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={form.watch("frequency")}
                  onValueChange={(value) =>
                    form.setValue(
                      "frequency",
                      value as "daily" | "weekly" | "monthly"
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!selectedTask && (
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...form.register("startDate")}
                  />
                  {form.formState.errors.startDate && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.startDate.message}
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : selectedTask ? (
                    "Update Task"
                  ) : (
                    "Add Task"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!tasks || tasks.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={ClipboardCheck}
              title="No tasks yet"
              description="Start adding daily, weekly, or monthly tasks to track your habits and goals."
              actionLabel="Add First Task"
              onAction={() => setIsDialogOpen(true)}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Daily Tasks - Week View */}
          {dailyTasks.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-blue-500" />
                    Daily Tasks
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigateWeek(-1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToToday}
                    >
                      Today
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigateWeek(1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left p-2 min-w-[200px] text-sm font-medium text-muted-foreground">
                          Task
                        </th>
                        {weekDates.map((date, i) => {
                          const key = formatDateKey(date);
                          const isToday = key === todayKey;
                          return (
                            <th
                              key={key}
                              className={`text-center p-2 min-w-[60px] text-xs ${
                                isToday
                                  ? "bg-primary/10 rounded-t-lg"
                                  : ""
                              }`}
                            >
                              <div className="font-medium text-muted-foreground">
                                {dayNames[i]}
                              </div>
                              <div
                                className={`text-sm mt-0.5 ${
                                  isToday
                                    ? "font-bold text-primary"
                                    : ""
                                }`}
                              >
                                {date.getDate()}
                              </div>
                            </th>
                          );
                        })}
                        <th className="p-2 min-w-[80px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyTasks.map((task) => (
                        <tr key={task.id} className="border-t">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {task.taskName}
                              </span>
                            </div>
                          </td>
                          {weekDates.map((date) => {
                            const key = formatDateKey(date);
                            const isCompleted =
                              task.completions.includes(key);
                            const isToday = key === todayKey;
                            return (
                              <td
                                key={key}
                                className={`text-center p-2 ${
                                  isToday ? "bg-primary/10" : ""
                                }`}
                              >
                                <button
                                  onClick={() =>
                                    toggleMutation.mutate({
                                      taskId: task.id,
                                      date: key,
                                    })
                                  }
                                  className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center mx-auto transition-colors ${
                                    isCompleted
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-muted-foreground/30 hover:border-primary/50"
                                  }`}
                                >
                                  {isCompleted && (
                                    <Check className="h-4 w-4" />
                                  )}
                                </button>
                              </td>
                            );
                          })}
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEdit(task)}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  deleteMutation.mutate(task.id)
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly Tasks */}
          {weeklyTasks.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-purple-500" />
                    Weekly Tasks
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigateMonth(-1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[120px] text-center">
                      {monthNames[currentDate.getMonth()]}{" "}
                      {currentDate.getFullYear()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigateMonth(1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weeklyTasks.map((task) => {
                    // Get all week start dates (Mondays) in the current month
                    const weeks: Date[] = [];
                    const firstDay = new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth(),
                      1
                    );
                    let monday = new Date(firstDay);
                    const dayOfWeek = (monday.getDay() + 6) % 7;
                    monday.setDate(monday.getDate() - dayOfWeek);

                    while (
                      monday.getMonth() <= currentDate.getMonth() ||
                      (monday.getMonth() === 11 &&
                        currentDate.getMonth() === 0)
                    ) {
                      if (
                        monday.getMonth() === currentDate.getMonth() ||
                        new Date(
                          monday.getTime() + 6 * 86400000
                        ).getMonth() === currentDate.getMonth()
                      ) {
                        weeks.push(new Date(monday));
                      }
                      monday = new Date(
                        monday.getTime() + 7 * 86400000
                      );
                      if (weeks.length >= 6) break;
                    }

                    return (
                      <div
                        key={task.id}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {task.taskName}
                            </span>
                            <Badge
                              variant="secondary"
                              className={frequencyColors.weekly}
                            >
                              Weekly
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(task)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                deleteMutation.mutate(task.id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {weeks.map((weekStart) => {
                            const weekEnd = new Date(
                              weekStart.getTime() + 6 * 86400000
                            );
                            const key = formatDateKey(weekStart);
                            const isCompleted =
                              task.completions.includes(key);
                            const isCurrentWeek =
                              getWeekDates(new Date())[0]
                                .toISOString()
                                .split("T")[0] === key;

                            return (
                              <button
                                key={key}
                                onClick={() =>
                                  toggleMutation.mutate({
                                    taskId: task.id,
                                    date: key,
                                  })
                                }
                                className={`px-3 py-2 rounded-lg border-2 text-xs transition-colors ${
                                  isCompleted
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : isCurrentWeek
                                    ? "border-primary/50 bg-primary/5"
                                    : "border-muted-foreground/20 hover:border-primary/50"
                                }`}
                              >
                                <div className="font-medium">
                                  {weekStart.getDate()}-
                                  {weekEnd.getDate()}
                                </div>
                                <div className="text-[10px] opacity-75">
                                  {monthNames[
                                    weekStart.getMonth()
                                  ].substring(0, 3)}
                                </div>
                              </button>
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

          {/* Monthly Tasks */}
          {monthlyTasks.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-green-500" />
                    Monthly Tasks
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const d = new Date(currentDate);
                        d.setFullYear(d.getFullYear() - 1);
                        setCurrentDate(d);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      {currentDate.getFullYear()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const d = new Date(currentDate);
                        d.setFullYear(d.getFullYear() + 1);
                        setCurrentDate(d);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {monthlyTasks.map((task) => {
                    return (
                      <div
                        key={task.id}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {task.taskName}
                            </span>
                            <Badge
                              variant="secondary"
                              className={frequencyColors.monthly}
                            >
                              Monthly
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(task)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                deleteMutation.mutate(task.id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {monthNames.map((monthName, index) => {
                            const key = `${currentDate.getFullYear()}-${String(
                              index + 1
                            ).padStart(2, "0")}-01`;
                            const isCompleted =
                              task.completions.includes(key);
                            const isCurrentMonth =
                              new Date().getMonth() === index &&
                              new Date().getFullYear() ===
                                currentDate.getFullYear();

                            return (
                              <button
                                key={key}
                                onClick={() =>
                                  toggleMutation.mutate({
                                    taskId: task.id,
                                    date: key,
                                  })
                                }
                                className={`px-3 py-2 rounded-lg border-2 text-xs transition-colors ${
                                  isCompleted
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : isCurrentMonth
                                    ? "border-primary/50 bg-primary/5"
                                    : "border-muted-foreground/20 hover:border-primary/50"
                                }`}
                              >
                                {monthName.substring(0, 3)}
                              </button>
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
        </div>
      )}
    </div>
  );
}
