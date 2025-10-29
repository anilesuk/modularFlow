import { Shield, Lock, CheckCircle2, FileText, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-semibold">CV Tailoring Pro</h1>
          </div>
          <Button
            data-testid="button-login"
            onClick={() => window.location.href = '/api/login'}
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-accent/50 px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4 text-accent-foreground" />
            <span>AI-Powered CV Optimization</span>
          </div>
          
          <h1 className="text-5xl font-semibold leading-tight">
            Tailor Your CV to Any Job Posting in Minutes
          </h1>
          
          <p className="text-xl text-muted-foreground">
            Enterprise-grade AI platform that analyzes job postings and generates perfectly tailored CVs, cover letters, and enhancement reports—all ATS-compliant and privacy-secure.
          </p>

          <div className="pt-6">
            <Button
              size="lg"
              data-testid="button-get-started"
              onClick={() => window.location.href = '/api/login'}
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Security Badges */}
      <section className="bg-card py-12 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Enterprise Security</h3>
                <p className="text-sm text-muted-foreground">
                  Bank-level encryption and secure authentication
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Privacy Compliant</h3>
                <p className="text-sm text-muted-foreground">
                  GDPR & SOC2 compliant with full audit logging
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">ATS Optimized</h3>
                <p className="text-sm text-muted-foreground">
                  Guaranteed compatibility with all major ATS systems
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-semibold text-center mb-12">
          How It Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 hover-elevate">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">1</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Submit Job URL</h3>
                <p className="text-sm text-muted-foreground">
                  Paste any job posting URL. Our AI scrapes and analyzes the job description, requirements, and company information.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover-elevate">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">2</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Two-Pass AI Optimization</h3>
                <p className="text-sm text-muted-foreground">
                  Pass 1 generates a draft with scorecard analysis. Pass 2 applies recommendations and optimizes for perfect alignment.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover-elevate">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">3</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">ATS Validation</h3>
                <p className="text-sm text-muted-foreground">
                  Automated validation ensures compliance with ATS requirements: no pronouns, SOAR format bullets, proper formatting.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover-elevate">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">4</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Download Documents</h3>
                <p className="text-sm text-muted-foreground">
                  Receive professional .docx files: tailored CV, cover letter, and enhancement tracking document—ready to submit.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-primary" />
              <span className="font-semibold">CV Tailoring Pro</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <span className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>SOC2 Compliant</span>
              </span>
              <span className="flex items-center space-x-2">
                <Lock className="h-4 w-4" />
                <span>GDPR Compliant</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
