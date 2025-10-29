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
import type { Scorecard, TraceChange, CvDocument, CoverLetter } from "@shared/schema";
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

  // Show "still processing" only for non-failed incomplete runs
  if (!run || (run.status !== "COMPLETED" && run.status !== "FAILED")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Results Not Available</h2>
          <p className="text-muted-foreground mb-6">
            This application is still being processed. Please check back in a few minutes.
          </p>
          <Link href="/">
            <Button data-testid="button-return-results-not-available">Return to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }
  
  // For FAILED runs, show partial results if available
  const hasDraft = !!draft;
  const hasFinal = !!final;
  const hasArtifacts = !!artifact;

  const scorecardPass1 = draft?.scorecardPass1Jsonb as unknown as Scorecard | undefined;
  const scorecardPass2 = final?.scorecardPass2Jsonb as unknown as Scorecard | undefined;
  const addedPoints = final?.addedPointsJsonb as unknown as TraceChange[] | undefined;

  const avgScorePass1 = scorecardPass1?.scorecard?.reduce((sum, item) => sum + item.score_1_to_10, 0) / (scorecardPass1?.scorecard?.length || 1) || 0;
  const avgScorePass2 = scorecardPass2?.scorecard?.reduce((sum, item) => sum + item.score_1_to_10, 0) / (scorecardPass2?.scorecard?.length || 1) || 0;

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

        {/* Warning banner for failed runs */}
        {run.status === "FAILED" && (
          <Card className="p-6 mb-8 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                  Processing Incomplete
                </h3>
                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  The processing pipeline encountered an error: {run.errorMessage || "Unknown error"}
                  {hasDraft || hasFinal ? " However, partial results are available below." : ""}
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Application Results</h1>
            <p className="text-muted-foreground" data-testid="text-job-url">
              {run.jobPostUrl}
            </p>
          </div>
          {hasArtifacts ? (
            <Button onClick={handleDownloadAll} data-testid="button-download-all">
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          ) : (
            <Badge variant="secondary" data-testid="badge-no-downloads">
              Downloads not available
            </Badge>
          )}
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
              
              {(scorecardPass2 || scorecardPass1) ? (
                <>
                  {run.status === "FAILED" && !scorecardPass2 && scorecardPass1 && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Showing Pass 1 scorecard (optimization not completed)
                    </p>
                  )}
                  {(scorecardPass2?.scorecard || scorecardPass1?.scorecard || []).map((item, index) => (
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
                </>
              ) : (
                <p className="text-muted-foreground">Scorecard data not available.</p>
              )}
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
                  disabled={!hasArtifacts || downloading === "added-points"}
                  data-testid="button-download-enhancements"
                >
                  {downloading === "added-points" ? "Downloading..." : hasArtifacts ? "Download .docx" : "Not Available"}
                </Button>
              </div>
              
              <div className="space-y-4">
                {addedPoints && addedPoints.length > 0 ? (
                  addedPoints.map((point, index) => (
                    <div key={index} className="pb-4 border-b border-border last:border-0 last:pb-0" data-testid={`enhancement-${index}`}>
                      <div className="font-medium mb-2" data-testid={`enhancement-description-${index}`}>
                        {index + 1}. {point.description}
                      </div>
                      <blockquote className="pl-4 border-l-4 border-primary/30 text-sm text-muted-foreground italic" data-testid={`enhancement-quote-${index}`}>
                        "{point.quote}"
                      </blockquote>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">Enhancement data not available (optimization not completed).</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="cv" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Tailored CV</h2>
                <Button
                  onClick={() => handleDownload("cv")}
                  disabled={!hasArtifacts || downloading === "cv"}
                  data-testid="button-download-cv"
                >
                  {downloading === "cv" ? "Downloading..." : hasArtifacts ? "Download .docx" : "Not Available"}
                </Button>
              </div>
              
              {(final?.cvJsonb || draft?.cvJsonb) ? (
                <div className="space-y-6 border-t pt-6" data-testid="cv-content">
                  {!final?.cvJsonb && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Showing draft CV (optimization not completed)
                      </p>
                    </div>
                  )}
                  
                  {(() => {
                    const cv = (final?.cvJsonb || draft?.cvJsonb) as CvDocument | undefined;
                    if (!cv) return null;
                    return (
                      <>
                        {/* Header */}
                        <div className="text-center border-b pb-4">
                          <h3 className="text-2xl font-bold" data-testid="cv-name">{cv.header.full_name}</h3>
                          <div className="text-sm text-muted-foreground mt-2 space-x-2">
                            {cv.header.city_region && <span>{cv.header.city_region}</span>}
                            {cv.header.phone && <span>• {cv.header.phone}</span>}
                            {cv.header.email && <span>• {cv.header.email}</span>}
                            {cv.header.linkedin && <span>• {cv.header.linkedin}</span>}
                          </div>
                        </div>

                        {/* Headline */}
                        <div>
                          <h4 className="text-lg font-semibold mb-2">Professional Headline</h4>
                          <p className="text-sm">{cv.headline}</p>
                        </div>

                        {/* Profile Summary */}
                        <div>
                          <h4 className="text-lg font-semibold mb-2">Profile Summary</h4>
                          <p className="text-sm">{cv.profile_summary}</p>
                        </div>

                        {/* Key Skills */}
                        <div>
                          <h4 className="text-lg font-semibold mb-2">Key Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {cv.key_skills?.map((skill: string, idx: number) => (
                              <Badge key={idx} variant="secondary">{skill}</Badge>
                            ))}
                          </div>
                        </div>

                        {/* Technical Skills */}
                        {cv.technical_skills && (
                          <div>
                            <h4 className="text-lg font-semibold mb-2">Technical Skills</h4>
                            <p className="text-sm">{cv.technical_skills}</p>
                          </div>
                        )}

                        {/* Experience */}
                        <div>
                          <h4 className="text-lg font-semibold mb-3">Professional Experience</h4>
                          <div className="space-y-4">
                            {cv.experience?.map((exp: any, idx: number) => (
                              <div key={idx} className="border-l-2 border-primary/30 pl-4">
                                <h5 className="font-semibold">{exp.title}</h5>
                                <div className="text-sm text-muted-foreground mb-2">
                                  {exp.employer} {exp.location && `• ${exp.location}`}
                                  <span className="ml-2">
                                    {exp.dates.from_year} - {exp.dates.to_year || 'Present'}
                                  </span>
                                </div>
                                <p className="text-sm mb-2">{exp.overview}</p>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                  {exp.achievements?.map((ach: any, aidx: number) => (
                                    <li key={aidx}>{ach.bullet}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Education */}
                        {cv.education && cv.education.length > 0 && (
                          <div>
                            <h4 className="text-lg font-semibold mb-2">Education</h4>
                            <div className="space-y-2">
                              {cv.education.map((edu: any, idx: number) => (
                                <div key={idx} className="text-sm">
                                  <span className="font-medium">{edu.qualification}</span>
                                  <span className="text-muted-foreground"> - {edu.institution}</span>
                                  {edu.city_country && <span className="text-muted-foreground"> ({edu.city_country})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Certifications */}
                        {cv.certifications && cv.certifications.length > 0 && (
                          <div>
                            <h4 className="text-lg font-semibold mb-2">Certifications</h4>
                            <ul className="list-disc list-inside text-sm space-y-1">
                              {cv.certifications.map((cert: string, idx: number) => (
                                <li key={idx}>{cert}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  CV data not available. Processing may have failed before draft generation.
                </p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="cover-letter" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Cover Letter</h2>
                <Button
                  onClick={() => handleDownload("cover-letter")}
                  disabled={!hasArtifacts || downloading === "cover-letter"}
                  data-testid="button-download-cover-letter"
                >
                  {downloading === "cover-letter" ? "Downloading..." : hasArtifacts ? "Download .docx" : "Not Available"}
                </Button>
              </div>
              
              {(final?.coverLetterJsonb || draft?.coverLetterJsonb) ? (
                <div className="space-y-6 border-t pt-6" data-testid="cover-letter-content">
                  {!final?.coverLetterJsonb && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Showing draft cover letter (optimization not completed)
                      </p>
                    </div>
                  )}
                  
                  {(() => {
                    const cl = (final?.coverLetterJsonb || draft?.coverLetterJsonb) as CoverLetter | undefined;
                    if (!cl) return null;
                    return (
                      <div className="max-w-3xl space-y-4 text-sm">
                        {/* Header */}
                        <div className="text-right">
                          <div className="font-semibold">{cl.header.full_name}</div>
                          <div className="text-muted-foreground whitespace-pre-line">{cl.header.contact_block}</div>
                          {cl.header.city_region && <div className="text-muted-foreground">{cl.header.city_region}</div>}
                        </div>

                        {/* Date */}
                        <div className="mt-6">
                          <div>{new Date(cl.meta.date_iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>

                        {/* Recipient */}
                        {(cl.meta.recipient.name || cl.meta.recipient.company) && (
                          <div className="mt-4">
                            {cl.meta.recipient.name && <div>{cl.meta.recipient.name}</div>}
                            {cl.meta.recipient.title && <div>{cl.meta.recipient.title}</div>}
                            {cl.meta.recipient.company && <div>{cl.meta.recipient.company}</div>}
                            {cl.meta.recipient.address && <div className="whitespace-pre-line">{cl.meta.recipient.address}</div>}
                          </div>
                        )}

                        {/* Subject */}
                        <div className="mt-4 font-semibold">
                          Re: {cl.meta.subject}
                        </div>

                        {/* Body Paragraphs */}
                        <div className="mt-6 space-y-4">
                          <p>{cl.paragraphs.opening}</p>
                          <p>{cl.paragraphs.alignment}</p>
                          <p>{cl.paragraphs.fit_evidence}</p>
                          <p>{cl.paragraphs.closing}</p>
                        </div>

                        {/* Sign-off */}
                        <div className="mt-6">
                          <div>{cl.sign_off.closing},</div>
                          <div className="mt-4 font-semibold">{cl.sign_off.name}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Cover letter data not available. Processing may have failed before draft generation.
                </p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
