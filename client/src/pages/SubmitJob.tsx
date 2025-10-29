import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Link2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Candidate } from "@shared/schema";

const submitSchema = z.object({
  candidateId: z.string().min(1, "Please select a candidate"),
  jobPostUrl: z.string().url("Please enter a valid URL"),
});

type SubmitForm = z.infer<typeof submitSchema>;

export default function SubmitJob() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  
  const { data: candidates = [], isLoading: candidatesLoading } = useQuery<Candidate[]>({ 
    queryKey: ["/api/candidates"] 
  });

  const form = useForm<SubmitForm>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      candidateId: "",
      jobPostUrl: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: SubmitForm) => {
      return await apiRequest("/api/runs", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
      toast({
        title: "Job Submitted",
        description: "Your application is being processed. Redirecting to status page...",
      });
      setTimeout(() => {
        navigate(`/status/${data.runId}`);
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateUrl = async (url: string) => {
    try {
      setIsValidating(true);
      const response = await fetch(`/api/validate-url?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (!response.ok) {
        form.setError("jobPostUrl", { message: data.error || "Invalid URL" });
        return false;
      }
      
      return true;
    } catch (error) {
      form.setError("jobPostUrl", { message: "Failed to validate URL" });
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const onSubmit = async (data: SubmitForm) => {
    const isValid = await validateUrl(data.jobPostUrl);
    if (!isValid) return;
    
    submitMutation.mutate(data);
  };

  if (candidatesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <Card className="max-w-md w-full p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Create Your Profile First</h2>
          <p className="text-muted-foreground mb-6">
            You need to create a candidate profile before submitting job applications.
          </p>
          <Button onClick={() => navigate("/profile")}>
            Create Profile
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Submit New Job Application</h1>
          <p className="text-muted-foreground">
            Enter a job posting URL to generate tailored CV and cover letter documents
          </p>
        </div>

        <Card className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="candidateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Candidate Profile</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-candidate">
                          <SelectValue placeholder="Choose a profile" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {candidates.map((candidate) => (
                          <SelectItem 
                            key={candidate.id} 
                            value={candidate.id}
                            data-testid={`option-candidate-${candidate.id}`}
                          >
                            {candidate.fullName} ({candidate.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This profile's CV will be tailored to the job posting
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobPostUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Posting URL</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="url"
                          placeholder="https://careers.company.com/job/123"
                          className="pl-10"
                          data-testid="input-job-url"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Paste the URL of any job posting (LinkedIn, Indeed, company careers page, etc.)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-4 pt-4">
                <Button
                  type="submit"
                  disabled={submitMutation.isPending || isValidating}
                  data-testid="button-submit"
                  className="flex-1"
                >
                  {submitMutation.isPending || isValidating ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      {isValidating ? "Validating..." : "Processing..."}
                    </>
                  ) : (
                    <>
                      Submit Application
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </Card>

        {/* Process Preview */}
        <Card className="mt-8 p-6 bg-accent/20">
          <h3 className="font-semibold mb-4">What Happens Next</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">Job Analysis:</span> AI scrapes and analyzes the job description, requirements, and company info
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">Pass 1:</span> Generate draft CV and cover letter with scorecard analysis
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">Pass 2:</span> Apply AI recommendations and optimize for perfect job alignment
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">Validation:</span> Ensure ATS compliance and professional formatting
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">Documents:</span> Generate professional .docx files ready to submit
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
