import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";

import HomePage from "@/pages/home";
import AnalysisPage from "@/pages/analysis";
import ResultsPage from "@/pages/results";
import SettingsPage from "@/pages/settings";
import LandingPage from "@/pages/landing";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Switch>
      {isAuthenticated ? (
        <>
          <Route path="/" component={HomePage} />
          <Route path="/analysis" component={AnalysisPage} />
          <Route path="/results/:id" component={ResultsPage} />
          <Route path="/settings" component={SettingsPage} />
        </>
      ) : (
        <Route path="/" component={LandingPage} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
