import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Bell, CalendarClock, Clock, ChevronRight, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Reminder } from "@shared/schema";

export function ReminderPopup() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasShown, setHasShown] = useState(false);

  const { data: pending = [], isSuccess } = useQuery({
    queryKey: ["/api/reminders/pending"],
    queryFn: () => api.get<Reminder[]>("/reminders/pending"),
    enabled: isAuthenticated,
    staleTime: 0,
  });

  // Show popup once per session when pending reminders arrive
  useEffect(() => {
    if (isSuccess && pending.length > 0 && !hasShown) {
      setCurrentIndex(0);
      setOpen(true);
      setHasShown(true);
    }
  }, [isSuccess, pending.length, hasShown]);

  const dismissMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/reminders/${id}/dismiss`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/pending"] });
    },
  });

  const handleDismissCurrent = () => {
    const current = pending[currentIndex];
    if (current) {
      dismissMutation.mutate(current.id);
    }
    if (pending.length <= 1) {
      setOpen(false);
    } else {
      // Move to next (or stay at last)
      setCurrentIndex((i) => Math.min(i, pending.length - 2));
    }
  };

  const handleDismissAll = () => {
    pending.forEach((r) => dismissMutation.mutate(r.id));
    setOpen(false);
  };

  const formatDate = (date: string, time?: string) => {
    try {
      const d = format(parseISO(date), "EEEE, dd MMM yyyy");
      return time ? `${d} at ${time}` : d;
    } catch {
      return time ? `${date} at ${time}` : date;
    }
  };

  const formatRemindAt = (iso: string) => {
    try {
      return format(parseISO(iso), "dd MMM yyyy, hh:mm a");
    } catch {
      return iso;
    }
  };

  // Adjust index if pending shrinks after dismissals
  const safeIndex = Math.min(currentIndex, Math.max(0, pending.length - 1));
  const current = pending[safeIndex];

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Bell className="h-4 w-4 text-primary animate-[bell_0.5s_ease-in-out_2]" />
            </span>
            Reminder
            {pending.length > 1 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {safeIndex + 1} / {pending.length}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Reminder card */}
          <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
            <p className="text-base font-semibold leading-tight">{current.title}</p>

            {current.description && (
              <p className="text-sm text-muted-foreground">{current.description}</p>
            )}

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Event: <strong className="text-foreground">
                    {formatDate(current.eventDate, current.eventTime)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Remind time: <strong className="text-foreground">
                    {formatRemindAt(current.remindAt)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Navigation for multiple reminders */}
          {pending.length > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                disabled={safeIndex === 0}
                onClick={() => setCurrentIndex((i) => i - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={safeIndex === pending.length - 1}
                onClick={() => setCurrentIndex((i) => i + 1)}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {pending.length > 1 && (
            <Button variant="outline" size="sm" onClick={handleDismissAll} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Dismiss All
            </Button>
          )}
          <Button onClick={handleDismissCurrent} className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Got It
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
