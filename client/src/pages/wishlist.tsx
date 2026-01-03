import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Heart, Trash2, Edit2, CheckCircle2, Circle, UtensilsCrossed, Plane, Film, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { PageLoader, LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { Wishlist } from "@shared/schema";

const wishlistFormSchema = z.object({
  wish: z.string().min(1, "Wish is required"),
  category: z.enum(["Food", "Travel", "Entertainment", "Other"]),
});

type WishlistFormData = z.infer<typeof wishlistFormSchema>;

const categoryIcons = {
  Food: UtensilsCrossed,
  Travel: Plane,
  Entertainment: Film,
  Other: MoreHorizontal,
};

const categoryColors = {
  Food: "text-orange-500",
  Travel: "text-blue-500",
  Entertainment: "text-purple-500",
  Other: "text-gray-500",
};

export default function WishlistPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Wishlist | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wishlist, isLoading } = useQuery({
    queryKey: ["/api/wishlist"],
    queryFn: () => api.get<Wishlist[]>("/wishlist"),
  });

  const form = useForm<WishlistFormData>({
    resolver: zodResolver(wishlistFormSchema),
    defaultValues: { wish: "", category: "Food" },
  });

  const createMutation = useMutation({
    mutationFn: (data: WishlistFormData) => api.post<Wishlist>("/wishlist", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({ title: "Wish added", description: "Your wish has been added to the list." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create wish",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: WishlistFormData) =>
      api.put<Wishlist>(`/wishlist/${selectedItem?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({ title: "Wish updated", description: "Your wish has been updated." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update wish",
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "pending" | "completed" }) =>
      api.put<Wishlist>(`/wishlist/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/wishlist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({ title: "Wish deleted", description: "The wish has been removed." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete wish",
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedItem(null);
    form.reset({ wish: "", category: "Food" });
  };

  const handleEdit = (item: Wishlist) => {
    setSelectedItem(item);
    form.reset({
      wish: item.wish,
      category: item.category,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: WishlistFormData) => {
    if (selectedItem) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleToggleStatus = (item: Wishlist) => {
    const newStatus = item.status === "pending" ? "completed" : "pending";
    toggleStatusMutation.mutate({ id: item.id, status: newStatus });
  };

  if (isLoading) {
    return <PageLoader />;
  }

  // Filter wishlist
  const filteredWishlist = wishlist?.filter((item) => {
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesCategory && matchesStatus;
  }) || [];

  const pendingWishlist = wishlist?.filter((item) => item.status === "pending") || [];
  const completedWishlist = wishlist?.filter((item) => item.status === "completed") || [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Wishlist</h1>
          <p className="text-muted-foreground">Track experiences to enjoy with loved ones</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Wish
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedItem ? "Edit Wish" : "Add New Wish"}</DialogTitle>
              <DialogDescription>
                {selectedItem ? "Update your wish details" : "Add something you'd like to experience"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wish">Wish</Label>
                <Input
                  id="wish"
                  placeholder="e.g., Try authentic Shawarma"
                  {...form.register("wish")}
                />
                {form.formState.errors.wish && (
                  <p className="text-sm text-destructive">{form.formState.errors.wish.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={form.watch("category")}
                  onValueChange={(value) => form.setValue("category", value as any)}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Travel">Travel</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.category && (
                  <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
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
                  ) : selectedItem ? (
                    "Update Wish"
                  ) : (
                    "Add Wish"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Food">Food</SelectItem>
            <SelectItem value="Travel">Travel</SelectItem>
            <SelectItem value="Entertainment">Entertainment</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-3 bg-muted/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 px-1">
            <Circle className="h-4 w-4" />
            Pending ({pendingWishlist.length})
          </div>
        </Card>
        <Card className="p-3 bg-muted/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 px-1">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Completed ({completedWishlist.length})
          </div>
        </Card>
      </div>

      {!wishlist || wishlist.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Heart}
              title="No wishes yet"
              description="Start adding experiences you'd like to enjoy with your loved ones."
              actionLabel="Add First Wish"
              onAction={() => setIsDialogOpen(true)}
            />
          </CardContent>
        </Card>
      ) : filteredWishlist.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No wishes match the selected filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredWishlist.map((item) => {
            const Icon = categoryIcons[item.category];
            const iconColor = categoryColors[item.category];
            const isCompleted = item.status === "completed";

            return (
              <Card
                key={item.id}
                className={`flex flex-col ${isCompleted ? "bg-muted/30" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${iconColor}`} />
                      {isCompleted && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p
                    className={`text-sm flex-1 ${isCompleted ? "line-through text-muted-foreground" : ""}`}
                  >
                    {item.wish}
                  </p>
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{item.category}</span>
                    <Button
                      variant={isCompleted ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleStatus(item)}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Done
                        </>
                      ) : (
                        <>
                          <Circle className="h-4 w-4 mr-1" />
                          Pending
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

