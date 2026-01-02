import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { PageLoader } from "@/components/LoadingSpinner";

import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import ExpensesPage from "@/pages/expenses";
import EMIPage from "@/pages/emi";
import GoalsPage from "@/pages/goals";
import PlansPage from "@/pages/plans";
import FinancePage from "@/pages/finance";
import ProfilePage from "@/pages/profile";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  return <Component />;
}

function AuthRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return <AuthPage />;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function ProtectedLayout({ component: Component }: { component: () => JSX.Element }) {
  return (
    <ProtectedRoute
      component={() => (
        <AppLayout>
          <Component />
        </AppLayout>
      )}
    />
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthRoute} />
      <Route path="/dashboard">
        <ProtectedLayout component={DashboardPage} />
      </Route>
      <Route path="/expenses">
        <ProtectedLayout component={ExpensesPage} />
      </Route>
      <Route path="/emi">
        <ProtectedLayout component={EMIPage} />
      </Route>
      <Route path="/goals">
        <ProtectedLayout component={GoalsPage} />
      </Route>
      <Route path="/plans">
        <ProtectedLayout component={PlansPage} />
      </Route>
      <Route path="/finance">
        <ProtectedLayout component={FinancePage} />
      </Route>
      <Route path="/profile">
        <ProtectedLayout component={ProfilePage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
