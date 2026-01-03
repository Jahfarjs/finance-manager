import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, BookOpen, Trash2, Edit2, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { PageLoader, LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { PersonalMemory } from "@shared/schema";
import { format, parseISO } from "date-fns";

const memoryFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  title: z.string().optional(),
  description: z.string().min(1, "Description is required"),
});

type MemoryFormData = z.infer<typeof memoryFormSchema>;

export default function MemoriesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<PersonalMemory | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: memories, isLoading } = useQuery({
    queryKey: ["/api/memories"],
    queryFn: () => api.get<PersonalMemory[]>("/memories"),
  });

  const form = useForm<MemoryFormData>({
    resolver: zodResolver(memoryFormSchema),
    defaultValues: { date: new Date().toISOString().split("T")[0], title: "", description: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: MemoryFormData) => api.post<PersonalMemory>("/memories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memories"] });
      toast({ title: "Memory added", description: "Your memory has been saved." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create memory",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: MemoryFormData) =>
      api.put<PersonalMemory>(`/memories/${selectedMemory?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memories"] });
      toast({ title: "Memory updated", description: "Your memory has been updated." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update memory",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/memories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memories"] });
      toast({ title: "Memory deleted", description: "The memory has been removed." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete memory",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedMemory(null);
    form.reset({ date: new Date().toISOString().split("T")[0], title: "", description: "" });
  };

  const handleEdit = (memory: PersonalMemory) => {
    setSelectedMemory(memory);
    form.reset({
      date: memory.date,
      title: memory.title || "",
      description: memory.description,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: MemoryFormData) => {
    if (selectedMemory) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  // Group memories by date
  const groupedMemories = memories?.reduce((acc, memory) => {
    const date = memory.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(memory);
    return acc;
  }, {} as Record<string, PersonalMemory[]>) || {};

  const sortedDates = Object.keys(groupedMemories).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Memories</h1>
          <p className="text-muted-foreground">Record meaningful moments and experiences</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Memory
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedMemory ? "Edit Memory" : "Add New Memory"}</DialogTitle>
              <DialogDescription>
                {selectedMemory ? "Update your memory details" : "Record a meaningful moment"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  {...form.register("date")}
                />
                {form.formState.errors.date && (
                  <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title (Optional)</Label>
                <Input
                  id="title"
                  placeholder="e.g., First day of the year"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your memory..."
                  rows={4}
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.description.message}
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
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <LoadingSpinner size="sm" />
                  ) : selectedMemory ? (
                    "Update Memory"
                  ) : (
                    "Add Memory"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!memories || memories.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={BookOpen}
              title="No memories yet"
              description="Start recording meaningful moments and experiences to cherish later."
              actionLabel="Add First Memory"
              onAction={() => setIsDialogOpen(true)}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {format(parseISO(date), "MMM d, yyyy")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {groupedMemories[date].map((memory) => (
                    <div
                      key={memory.id}
                      className="p-4 rounded-lg border bg-card space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {memory.title && (
                            <h3 className="font-semibold mb-1">{memory.title}</h3>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{memory.description}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(memory)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(memory.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

