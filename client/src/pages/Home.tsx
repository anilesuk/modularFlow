import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Plus, FileText, CheckCircle2, Clock, AlertCircle, Download, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Run } from "@shared/schema";

type DashboardRun = Run & {
  companyName?: string | null;
  roleTitle?: string | null;
  roleLocation?: string | null;
};

export default function Home() {
  const { data: runs = [], isLoading: runsLoading } = useQuery<DashboardRun[]>({ 
    queryKey: ["/api/runs"] 
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingRunId, setDownloadingRunId] = useState<string | null>(null);

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

  const sortedRuns = [...runs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filteredRuns = sortedRuns.filter((run) => {
    const haystack = [
      run.companyName,
      run.roleTitle,
      run.roleLocation,
      run.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchQuery.toLowerCase());
  });

  const handleDownloadCv = async (runId: string) => {
    setDownloadingRunId(runId);
    try {
      const response = await fetch(`/api/artifacts/${runId}/download?type=cv`);
      if (!response.ok) {
        throw new Error("Failed to download CV");
      }

      const contentType = response.headers.get("Content-Type");
      if (contentType?.includes("application/json")) {
        const { url } = await response.json();
        const fileResponse = await fetch(url);
        const blob = await fileResponse.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `CV-${runId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `CV-${runId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error("CV download failed", error);
    } finally {
      setDownloadingRunId(null);
    }
  };

  if (runsLoading) {
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
          <Card className="p-4 md:p-6">
            <div className="relative mb-4">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by company, role, location, or status"
                className="pl-10"
                data-testid="input-search-runs"
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Application Creation Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Tokens</TableHead>
                  <TableHead>Options</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRuns.map((run) => (
                  <TableRow key={run.id} data-testid={`row-run-${run.id}`}>
                    <TableCell>{run.companyName || "Not available yet"}</TableCell>
                    <TableCell>{run.roleTitle || "Not available yet"}</TableCell>
                    <TableCell>{run.roleLocation || "Not specified"}</TableCell>
                    <TableCell>{new Date(run.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(run.status)}</TableCell>
                    <TableCell>{run.totalTokens?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {run.status === "COMPLETED" ? (
                          <>
                            <Link href={`/results/${run.id}`}>
                              <Button size="sm" data-testid={`button-view-${run.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Results
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadCv(run.id)}
                              disabled={downloadingRunId === run.id}
                              data-testid={`button-download-${run.id}`}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {downloadingRunId === run.id ? "Downloading..." : "Download CV"}
                            </Button>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredRuns.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center" data-testid="text-no-search-results">
                No applications match your search.
              </div>
            )}
          </Card>
        )}
      </section>
    </div>
  );
}
