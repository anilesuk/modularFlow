import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState } from "react";
import { Download, ArrowLeft, FileText, Mail, ListChecks, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Run, Draft, Final, Artifact } from "@shared/schema";
import type { Scorecard, TraceChange } from "@shared/schema";
import { Link } from "wouter";

export default function Results() {
  const [, params] = useRoute("/results/:runId");
  const runId = params?.runId;

  const { data: runData, isLoading: runLoading } = useQuery<Run & { 
    draft?: Draft; 
    final?: Final; 
    artifact?: Artifact 
  }>({
    queryKey: ["/api/runs", runId],
  });

  const run = runData;
  const draft = runData?.draft;
  const final = runData?.final;
  const artifact = runData?.artifact;

  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (documentType: "cv" | "cover-letter" | "added-points") => {
    if (!artifact || !run) return;
    
    // Map document types to filenames
    const filenameMap = {
      "cv": "Tailored-CV.docx",
      "cover-letter": "Cover-Letter.docx",
      "added-points": "Enhancement-Notes.docx",
    };
    
    const filename = filenameMap[documentType];
    
    setDownloading(documentType);
    try {
      // Get signed download URL from backend
      const response = await fetch(`/api/artifacts/${run.id}/download?type=${documentType}`);
      if (!response.ok) {
        throw new Error("Failed to get download URL");
      }
      
      const { url } = await response.json();
      
      // Download using signed URL
      const fileResponse = await fetch(url);
      const blob = await fileResponse.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = () => {
    if (!artifact || !run) return;
    handleDownload("cv");
    setTimeout(() => handleDownload("cover-letter"), 500);
    setTimeout(() => handleDownload("added-points"), 1000);
  };

  if (runLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!run || run.status !== "COMPLETED") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Results Not Available</h2>
          <p className="text-muted-foreground mb-6">
            {run?.status === "FAILED" 
              ? "This processing run failed."
              : "This application is still being processed."}
          </p>
          <Link href="/">
            <Button data-testid="button-return-results-not-available">Return to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const scorecardPass1 = draft?.scorecardPass1Jsonb as unknown as Scorecard | undefined;
  const scorecardPass2 = final?.scorecardPass2Jsonb as unknown as Scorecard | undefined;
  const addedPoints = final?.addedPointsJsonb as unknown as TraceChange[] | undefined;

  const avgScorePass1 = scorecardPass1?.scorecard.reduce((sum, item) => sum + item.score_1_to_10, 0) / (scorecardPass1?.scorecard.length || 1);
  const avgScorePass2 = scorecardPass2?.scorecard.reduce((sum, item) => sum + item.score_1_to_10, 0) / (scorecardPass2?.scorecard.length || 1);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Application Results</h1>
            <p className="text-muted-foreground" data-testid="text-job-url">
              {run.jobPostUrl}
            </p>
          </div>
          <Button onClick={handleDownloadAll} data-testid="button-download-all">
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
        </div>

        {/* Score Improvement */}
        <Card className="p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Pass 1 Score</div>
              <div className="text-3xl font-semibold" data-testid="score-pass1">
                {avgScorePass1?.toFixed(1) || "N/A"}/10
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Final Score</div>
              <div className="text-3xl font-semibold text-green-600" data-testid="score-pass2">
                {avgScorePass2?.toFixed(1) || "N/A"}/10
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Improvement</div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-6 w-6 text-green-600" />
                <span className="text-3xl font-semibold text-green-600" data-testid="score-improvement">
                  +{((avgScorePass2 || 0) - (avgScorePass1 || 0)).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Documents */}
        <Tabs defaultValue="scorecard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scorecard" data-testid="tab-scorecard">
              <ListChecks className="h-4 w-4 mr-2" />
              Scorecard
            </TabsTrigger>
            <TabsTrigger value="enhancements" data-testid="tab-enhancements">
              <TrendingUp className="h-4 w-4 mr-2" />
              Enhancements
            </TabsTrigger>
            <TabsTrigger value="cv" data-testid="tab-cv">
              <FileText className="h-4 w-4 mr-2" />
              CV
            </TabsTrigger>
            <TabsTrigger value="cover-letter" data-testid="tab-cover-letter">
              <Mail className="h-4 w-4 mr-2" />
              Cover Letter
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scorecard" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Job Alignment Scorecard</h2>
              
              {scorecardPass2?.scorecard.map((item, index) => (
                <div key={index} className="mb-6 last:mb-0" data-testid={`scorecard-item-${index}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold" data-testid={`scorecard-area-${index}`}>{item.area}</h3>
                    <Badge data-testid={`scorecard-score-${index}`}>{item.score_1_to_10}/10</Badge>
                  </div>
                  <Progress value={item.score_1_to_10 * 10} className="h-2 mb-3" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground mb-1">Job Expectation:</div>
                      <p>{item.jd_expectation}</p>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">CV Strength:</div>
                      <p>{item.cv_strength}</p>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="enhancements" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Added & Enhanced Points</h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload("added-points")}
                  disabled={downloading === "added-points"}
                  data-testid="button-download-enhancements"
                >
                  {downloading === "added-points" ? "Downloading..." : "Download .docx"}
                </Button>
              </div>
              
              <div className="space-y-4">
                {addedPoints?.map((point, index) => (
                  <div key={index} className="pb-4 border-b border-border last:border-0 last:pb-0" data-testid={`enhancement-${index}`}>
                    <div className="font-medium mb-2" data-testid={`enhancement-description-${index}`}>
                      {index + 1}. {point.description}
                    </div>
                    <blockquote className="pl-4 border-l-4 border-primary/30 text-sm text-muted-foreground italic" data-testid={`enhancement-quote-${index}`}>
                      "{point.quote}"
                    </blockquote>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="cv" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Tailored CV</h2>
                <Button
                  onClick={() => handleDownload("cv")}
                  disabled={downloading === "cv"}
                  data-testid="button-download-cv"
                >
                  {downloading === "cv" ? "Downloading..." : "Download .docx"}
                </Button>
              </div>
              <p className="text-muted-foreground">
                Your tailored CV has been generated as a professional .docx file with ATS-compliant formatting.
                Click the download button above to get your document.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="cover-letter" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Cover Letter</h2>
                <Button
                  onClick={() => handleDownload("cover-letter")}
                  disabled={downloading === "cover-letter"}
                  data-testid="button-download-cover-letter"
                >
                  {downloading === "cover-letter" ? "Downloading..." : "Download .docx"}
                </Button>
              </div>
              <p className="text-muted-foreground">
                Your tailored cover letter has been generated as a professional .docx file in UK business format (300-400 words).
                Click the download button above to get your document.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
