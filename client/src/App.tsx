import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";

// Pages
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import SubmitJob from "@/pages/SubmitJob";
import ProcessingStatus from "@/pages/ProcessingStatus";
import Results from "@/pages/Results";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  useQuery<string[]>({
    queryKey: ["/api/llm/models"],
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={() => <Layout><Home /></Layout>} />
          <Route path="/submit" component={() => <Layout><SubmitJob /></Layout>} />
          <Route path="/status/:runId" component={() => <Layout><ProcessingStatus /></Layout>} />
          <Route path="/results/:runId" component={() => <Layout><Results /></Layout>} />
          <Route path="/profile" component={() => <Layout><Profile /></Layout>} />
          <Route path="/settings" component={() => <Layout><Settings /></Layout>} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
