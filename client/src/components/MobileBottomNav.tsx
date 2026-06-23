import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Wallet,
  ClipboardCheck,
  CreditCard,
  MoreHorizontal,
  Target,
  Calendar,
  BookOpen,
  Heart,
  ArrowLeftRight,
  User,
  LogOut,
  Bell,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

const primaryItems: NavItem[] = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Expenses", url: "/expenses", icon: Wallet },
  { title: "Tasks", url: "/daily-tasks", icon: ClipboardCheck },
  { title: "EMI", url: "/emi", icon: CreditCard },
];

const moreItems: NavItem[] = [
  { title: "Goals", url: "/goals", icon: Target },
  { title: "Plans", url: "/plans", icon: Calendar },
  { title: "Reminders", url: "/reminders", icon: Bell },
  { title: "Memories", url: "/memories", icon: BookOpen },
  { title: "Wishlist", url: "/wishlist", icon: Heart },
  { title: "Finance", url: "/finance", icon: ArrowLeftRight },
  { title: "Profile", url: "/profile", icon: User },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MobileBottomNav() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const isMoreActive = moreItems.some((item) => item.url === location);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {primaryItems.map((item) => {
            const isActive = location === item.url;
            return (
              <Link
                key={item.url}
                href={item.url}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`mobilenav-${item.title.toLowerCase()}`}
              >
                <item.icon className={cn("h-6 w-6", isActive && "scale-110")} />
                <span>{item.title}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors",
              isMoreActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid="mobilenav-more"
          >
            <MoreHorizontal className="h-6 w-6" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>

          <div className="mt-2 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {user?.name ? getInitials(user.name) : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name || "User"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email || ""}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {moreItems.map((item) => {
              const isActive = location === item.url;
              return (
                <Link
                  key={item.url}
                  href={item.url}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors",
                    isActive
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                  data-testid={`mobilenav-more-${item.title.toLowerCase()}`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                setLogoutModalOpen(true);
              }}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
              data-testid="mobilenav-logout"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmationModal
        open={logoutModalOpen}
        onOpenChange={setLogoutModalOpen}
        onConfirm={logout}
        variant="logout"
      />
    </>
  );
}
