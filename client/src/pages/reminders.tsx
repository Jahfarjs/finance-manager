import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Bell,
  BellOff,
  Plus,
  Trash2,
  Pencil,
  CalendarClock,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { Reminder, InsertReminder } from "@shared/schema";

type RemindBeforeOption = {
  label: string;
  value: string;
};

const REMIND_BEFORE_OPTIONS: RemindBeforeOption[] = [
  { label: "On the event day (morning 8 AM)", value: "same_day_morning" },
  { label: "1 hour before", value: "1h" },
  { label: "3 hours before", value: "3h" },
  { label: "6 hours before", value: "6h" },
  { label: "1 day before", value: "1d" },
  { label: "2 days before", value: "2d" },
  { label: "1 week before", value: "1w" },
];

function calcRemindAt(eventDate: string, eventTime: string, remindBefore: string): string {
  const [year, month, day] = eventDate.split("-").map(Number);
  const [hour, minute] = eventTime ? eventTime.split(":").map(Number) : [0, 0];

  // Base event datetime (local)
  const eventDt = new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);

  switch (remindBefore) {
    case "same_day_morning": {
      const d = new Date(year, month - 1, day, 8, 0, 0, 0);
      return d.toISOString();
    }
    case "1h":
      return new Date(eventDt.getTime() - 60 * 60 * 1000).toISOString();
    case "3h":
      return new Date(eventDt.getTime() - 3 * 60 * 60 * 1000).toISOString();
    case "6h":
      return new Date(eventDt.getTime() - 6 * 60 * 60 * 1000).toISOString();
    case "1d":
      return new Date(eventDt.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case "2d":
      return new Date(eventDt.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    case "1w":
      return new Date(eventDt.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(year, month - 1, day, 8, 0, 0, 0).toISOString();
  }
}

const defaultForm = {
  title: "",
  description: "",
  eventDate: "",
  eventTime: "",
  remindBefore: "same_day_morning",
};

export default function RemindersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [form, setForm] = useState({ ...defaultForm });

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["/api/reminders"],
    queryFn: () => api.get<Reminder[]>("/reminders"),
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertReminder) => api.post<Reminder>("/reminders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/pending"] });
      toast({ title: "Reminder created!" });
      handleCloseDialog();
    },
    onError: () => toast({ title: "Failed to create reminder", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertReminder> }) =>
      api.put<Reminder>(`/reminders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/pending"] });
      toast({ title: "Reminder updated!" });
      handleCloseDialog();
    },
    onError: () => toast({ title: "Failed to update reminder", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/reminders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/pending"] });
      toast({ title: "Reminder deleted" });
    },
    onError: () => toast({ title: "Failed to delete reminder", variant: "destructive" }),
  });

  const handleOpenCreate = () => {
    setEditingReminder(null);
    setForm({ ...defaultForm });
    setDialogOpen(true);
  };

  const handleOpenEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setForm({
      title: reminder.title,
      description: reminder.description ?? "",
      eventDate: reminder.eventDate,
      eventTime: reminder.eventTime ?? "",
      remindBefore: "same_day_morning",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingReminder(null);
    setForm({ ...defaultForm });
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.eventDate) {
      toast({ title: "Title and event date are required", variant: "destructive" });
      return;
    }

    const remindAt = calcRemindAt(form.eventDate, form.eventTime, form.remindBefore);

    const payload: InsertReminder = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      eventDate: form.eventDate,
      eventTime: form.eventTime || undefined,
      remindAt,
    };

    if (editingReminder) {
      updateMutation.mutate({ id: editingReminder.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const pending = reminders.filter((r) => r.status === "pending");
  const dismissed = reminders.filter((r) => r.status === "dismissed");

  const formatRemindAt = (iso: string) => {
    try {
      return format(parseISO(iso), "dd MMM yyyy, hh:mm a");
    } catch {
      return iso;
    }
  };

  const formatEventDate = (date: string, time?: string) => {
    try {
      const d = format(parseISO(date), "dd MMM yyyy");
      return time ? `${d} at ${time}` : d;
    } catch {
      return time ? `${date} at ${time}` : date;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Reminders
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set event reminders — get a popup when you open the app
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Reminder</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Bell className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No reminders yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending */}
          {pending.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Pending ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((r) => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    onEdit={handleOpenEdit}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    formatRemindAt={formatRemindAt}
                    formatEventDate={formatEventDate}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Dismissed */}
          {dismissed.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <BellOff className="h-4 w-4" />
                Dismissed ({dismissed.length})
              </h2>
              <div className="space-y-3">
                {dismissed.map((r) => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    onEdit={handleOpenEdit}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    formatRemindAt={formatRemindAt}
                    formatEventDate={formatEventDate}
                    muted
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingReminder ? "Edit Reminder" : "New Reminder"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Doctor appointment"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Add notes or details..."
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="eventDate">Event Date *</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eventTime">Event Time (optional)</Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={form.eventTime}
                  onChange={(e) => setForm((f) => ({ ...f, eventTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="remindBefore">Remind Me</Label>
              <Select
                value={form.remindBefore}
                onValueChange={(v) => setForm((f) => ({ ...f, remindBefore: v }))}
              >
                <SelectTrigger id="remindBefore">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMIND_BEFORE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.eventDate && (
              <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
                You will be reminded on:{" "}
                <strong>
                  {formatRemindAt(calcRemindAt(form.eventDate, form.eventTime, form.remindBefore))}
                </strong>
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingReminder ? "Save Changes" : "Create Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ReminderCardProps {
  reminder: Reminder;
  onEdit: (r: Reminder) => void;
  onDelete: (id: string) => void;
  formatRemindAt: (iso: string) => string;
  formatEventDate: (date: string, time?: string) => string;
  muted?: boolean;
}

function ReminderCard({
  reminder,
  onEdit,
  onDelete,
  formatRemindAt,
  formatEventDate,
  muted = false,
}: ReminderCardProps) {
  return (
    <Card className={muted ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm leading-tight">{reminder.title}</p>
              <Badge
                variant={reminder.status === "pending" ? "default" : "secondary"}
                className="text-[10px] h-4 px-1.5"
              >
                {reminder.status === "pending" ? (
                  <><Bell className="h-2.5 w-2.5 mr-1" />Pending</>
                ) : (
                  <><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Dismissed</>
                )}
              </Badge>
            </div>

            {reminder.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{reminder.description}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                Event: {formatEventDate(reminder.eventDate, reminder.eventTime)}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Remind: {formatRemindAt(reminder.remindAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(reminder)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(reminder.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
