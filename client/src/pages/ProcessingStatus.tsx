import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { CheckCircle2, Circle, Clock, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Run } from "@shared/schema";
import { Link } from "wouter";

export default function ProcessingStatus() {
  const [, params] = useRoute("/status/:runId");
  const runId = params?.runId;

  const { data: run, isLoading } = useQuery<Run>({
    queryKey: ["/api/runs", runId],
    refetchInterval: (query) => {
      const run = query.state.data as Run | undefined;
      if (!run) return false;
      return ["COMPLETED", "FAILED"].includes(run.status) ? false : 2000;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Loading status...</p>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Run Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The processing run you're looking for doesn't exist.
          </p>
          <Link href="/">
            <Button data-testid="button-return-not-found">Return to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const stages = [
    { id: "QUEUED", label: "Queued", description: "Application submitted and queued for processing" },
    { id: "SCRAPING", label: "Analyzing Job", description: "Extracting job requirements and company information" },
    { id: "DRAFT_PASS1", label: "Generating Draft", description: "Creating initial CV and cover letter with AI" },
    { id: "OPTIMIZING_PASS2", label: "Optimizing", description: "Applying recommendations and refining documents" },
    { id: "VALIDATED", label: "Validating", description: "Ensuring ATS compliance and formatting standards" },
    { id: "RENDERING", label: "Rendering", description: "Generating professional PDF documents" },
    { id: "COMPLETED", label: "Completed", description: "All documents ready for download" },
  ];

  const currentStageIndex = stages.findIndex(s => s.id === run.status);
  const progress = run.status === "FAILED" ? 0 : ((currentStageIndex + 1) / stages.length) * 100;

  const getStageIcon = (stageId: string) => {
    const stageIndex = stages.findIndex(s => s.id === stageId);
    
    if (run.status === "FAILED") {
      return <AlertCircle className="h-6 w-6 text-destructive" />;
    }
    
    if (stageIndex < currentStageIndex) {
      return <CheckCircle2 className="h-6 w-6 text-green-600" data-testid={`icon-completed-${stageId}`} />;
    } else if (stageIndex === currentStageIndex) {
      return <Clock className="h-6 w-6 text-primary animate-pulse" data-testid={`icon-current-${stageId}`} />;
    } else {
      return <Circle className="h-6 w-6 text-muted-foreground" data-testid={`icon-pending-${stageId}`} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold mb-2">Processing Status</h1>
            <p className="text-muted-foreground" data-testid="text-job-url">
              {run.jobPostUrl}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" data-testid="text-current-status">
                {run.status === "FAILED" ? "Processing Failed" : stages[currentStageIndex]?.label || run.status}
              </span>
              <span className="text-sm text-muted-foreground" data-testid="text-progress">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" data-testid="progress-bar" />
          </div>

          {/* Error Message */}
          {run.status === "FAILED" && run.errorMessage && (
            <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-destructive mb-1">Processing Failed</h3>
                  <p className="text-sm text-destructive/90" data-testid="text-error">
                    {run.errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Processing Pipeline</h2>
            
            <div className="space-y-4">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="flex items-start space-x-4"
                  data-testid={`stage-${stage.id}`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getStageIcon(stage.id)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold" data-testid={`text-stage-${stage.id}`}>
                        {stage.label}
                      </h3>
                      {index < currentStageIndex && (
                        <span className="text-xs text-green-600 font-medium">Done</span>
                      )}
                      {index === currentStageIndex && run.status !== "FAILED" && (
                        <span className="text-xs text-primary font-medium">In Progress</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {stage.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4 pt-8 border-t border-border mt-8">
            {run.status === "COMPLETED" && (
              <Link href={`/results/${run.id}`}>
                <Button data-testid="button-view-results">
                  View Results
                </Button>
              </Link>
            )}
            {run.status === "FAILED" && (
              <Link href="/submit">
                <Button data-testid="button-retry">
                  Submit New Application
                </Button>
              </Link>
            )}
            {!["COMPLETED", "FAILED"].includes(run.status) && (
              <div className="text-sm text-muted-foreground" data-testid="text-processing-info">
                Processing typically takes 2-4 minutes. This page will auto-refresh.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
