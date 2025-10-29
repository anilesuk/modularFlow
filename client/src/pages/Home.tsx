import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Plus, FileText, CheckCircle2, Clock, AlertCircle, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Run, Candidate } from "@shared/schema";

export default function Home() {
  const { data: runs = [], isLoading: runsLoading } = useQuery<Run[]>({ 
    queryKey: ["/api/runs"] 
  });
  
  const { data: candidates = [], isLoading: candidatesLoading } = useQuery<Candidate[]>({ 
    queryKey: ["/api/candidates"] 
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge data-testid={`badge-status-completed`} className="bg-green-500 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "FAILED":
        return <Badge data-testid={`badge-status-failed`} variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "QUEUED":
      case "SCRAPING":
      case "DRAFT_PASS1":
      case "OPTIMIZING_PASS2":
      case "VALIDATED":
      case "RENDERING":
        return <Badge data-testid={`badge-status-processing`} className="bg-blue-500 text-white"><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
      default:
        return <Badge data-testid={`badge-status-unknown`}>{status}</Badge>;
    }
  };

  const stats = {
    total: runs.length,
    completed: runs.filter(r => r.status === "COMPLETED").length,
    processing: runs.filter(r => !["COMPLETED", "FAILED"].includes(r.status)).length,
    failed: runs.filter(r => r.status === "FAILED").length,
  };

  if (runsLoading || candidatesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Stats Overview */}
      <section className="bg-card border-b border-border py-12">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl font-semibold mb-8">Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-2">Total Applications</div>
              <div className="text-3xl font-semibold" data-testid="stat-total">{stats.total}</div>
            </Card>
            
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-2">Completed</div>
              <div className="text-3xl font-semibold text-green-600" data-testid="stat-completed">{stats.completed}</div>
            </Card>
            
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-2">Processing</div>
              <div className="text-3xl font-semibold text-blue-600" data-testid="stat-processing">{stats.processing}</div>
            </Card>
            
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-2">Failed</div>
              <div className="text-3xl font-semibold text-red-600" data-testid="stat-failed">{stats.failed}</div>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold">Recent Applications</h2>
          <Link href="/submit">
            <Button data-testid="button-new-application">
              <Plus className="h-4 w-4 mr-2" />
              New Application
            </Button>
          </Link>
        </div>

        {runs.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
            <p className="text-muted-foreground mb-6">
              Get started by submitting your first job application
            </p>
            <Link href="/submit">
              <Button data-testid="button-create-first">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Application
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {runs.map((run) => {
              const candidate = candidates.find(c => c.id === run.candidateId);
              
              return (
                <Card key={run.id} className="p-6 hover-elevate" data-testid={`card-run-${run.id}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusBadge(run.status)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(run.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-semibold mb-1 truncate" data-testid={`text-candidate-${run.id}`}>
                        {candidate?.fullName || "Unknown Candidate"}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate" data-testid={`text-url-${run.id}`}>
                        {run.jobPostUrl}
                      </p>
                    </div>
                  </div>

                  {run.errorMessage && (
                    <div className="mb-4 p-3 bg-destructive/10 rounded-md">
                      <p className="text-sm text-destructive" data-testid={`text-error-${run.id}`}>
                        {run.errorMessage}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 pt-4 border-t border-border">
                    {run.status === "COMPLETED" ? (
                      <>
                        <Link href={`/results/${run.id}`}>
                          <Button size="sm" data-testid={`button-view-${run.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Results
                          </Button>
                        </Link>
                        <Link href={`/results/${run.id}?download=true`}>
                          <Button size="sm" variant="outline" data-testid={`button-download-${run.id}`}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </Link>
                      </>
                    ) : run.status !== "FAILED" ? (
                      <Link href={`/status/${run.id}`}>
                        <Button size="sm" variant="outline" data-testid={`button-status-${run.id}`}>
                          <Clock className="h-4 w-4 mr-2" />
                          View Progress
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" variant="outline" disabled data-testid={`button-failed-${run.id}`}>
                        Processing Failed
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
