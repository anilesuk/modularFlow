import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Candidate } from "@shared/schema";

// CV Preferences types matching server/cvConfig.ts
interface CvPreferences {
  profileSummary: { minWords: number; maxWords: number };
  keySkills: { minWords: number; maxWords: number };
  technicalSkills: { minWords: number; maxWords: number };
  experience: {
    mostRecentRole: { minBullets: number; maxBullets: number };
    secondRole: { minBullets: number; maxBullets: number };
    olderRoles: { bulletsPerRole: number };
  };
  evaluationCriteria: { exactCount: number };
}

// Validation schema for CV preferences
const cvPreferencesSchema = z.object({
  profileSummary: z.object({
    minWords: z.number().min(50).max(300),
    maxWords: z.number().min(50).max(300),
  }).refine(data => data.minWords <= data.maxWords, {
    message: "Min words must be less than or equal to max words",
    path: ["minWords"],
  }),
  keySkills: z.object({
    minWords: z.number().min(30).max(200),
    maxWords: z.number().min(30).max(200),
  }).refine(data => data.minWords <= data.maxWords, {
    message: "Min words must be less than or equal to max words",
    path: ["minWords"],
  }),
  technicalSkills: z.object({
    minWords: z.number().min(30).max(200),
    maxWords: z.number().min(30).max(200),
  }).refine(data => data.minWords <= data.maxWords, {
    message: "Min words must be less than or equal to max words",
    path: ["minWords"],
  }),
  experience: z.object({
    mostRecentRole: z.object({
      minBullets: z.number().min(1).max(15),
      maxBullets: z.number().min(1).max(15),
    }).refine(data => data.minBullets <= data.maxBullets, {
      message: "Min bullets must be less than or equal to max bullets",
      path: ["minBullets"],
    }),
    secondRole: z.object({
      minBullets: z.number().min(1).max(15),
      maxBullets: z.number().min(1).max(15),
    }).refine(data => data.minBullets <= data.maxBullets, {
      message: "Min bullets must be less than or equal to max bullets",
      path: ["minBullets"],
    }),
    olderRoles: z.object({
      bulletsPerRole: z.number().min(1).max(10),
    }),
  }),
  evaluationCriteria: z.object({
    exactCount: z.number().min(4).max(12),
  }),
});

interface CvSettingsDialogProps {
  candidate: Candidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CvSettingsDialog({ candidate, open, onOpenChange }: CvSettingsDialogProps) {
  const { toast } = useToast();

  // Fetch current preferences
  const { data: preferences, isLoading } = useQuery<CvPreferences>({
    queryKey: ["/api/candidates", candidate?.id, "cv-preferences"],
    queryFn: async () => {
      if (!candidate?.id) return null;
      const response = await fetch(`/api/candidates/${candidate.id}/cv-preferences`);
      if (!response.ok) throw new Error("Failed to fetch preferences");
      return response.json();
    },
    enabled: !!candidate?.id && open,
  });

  const form = useForm<CvPreferences>({
    resolver: zodResolver(cvPreferencesSchema),
    defaultValues: {
      profileSummary: { minWords: 95, maxWords: 125 },
      keySkills: { minWords: 60, maxWords: 80 },
      technicalSkills: { minWords: 60, maxWords: 100 },
      experience: {
        mostRecentRole: { minBullets: 5, maxBullets: 7 },
        secondRole: { minBullets: 3, maxBullets: 5 },
        olderRoles: { bulletsPerRole: 2 },
      },
      evaluationCriteria: { exactCount: 7 },
    },
  });

  // Update form when preferences are loaded
  useEffect(() => {
    if (preferences) {
      form.reset(preferences);
    }
  }, [preferences, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: CvPreferences) => {
      if (!candidate?.id) throw new Error("No candidate selected");
      const res = await apiRequest("PUT", `/api/candidates/${candidate.id}/cv-preferences`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates", candidate?.id, "cv-preferences"] });
      toast({
        title: "Preferences Saved",
        description: "Your CV generation preferences have been updated.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CvPreferences) => {
    saveMutation.mutate(data);
  };

  const resetToDefaults = () => {
    form.reset({
      profileSummary: { minWords: 95, maxWords: 125 },
      keySkills: { minWords: 60, maxWords: 80 },
      technicalSkills: { minWords: 60, maxWords: 100 },
      experience: {
        mostRecentRole: { minBullets: 5, maxBullets: 7 },
        secondRole: { minBullets: 3, maxBullets: 5 },
        olderRoles: { bulletsPerRole: 2 },
      },
      evaluationCriteria: { exactCount: 7 },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CV Generation Settings</DialogTitle>
          <DialogDescription>
            Customize how your CVs are generated. Changes will apply to future job applications for {candidate?.fullName}.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Profile Summary Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Profile Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="profileSummary.minWords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Words</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-profile-min-words"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="profileSummary.maxWords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Words</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-profile-max-words"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Key Skills Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Key Skills (Prose Paragraph)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="keySkills.minWords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Words</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-keyskills-min-words"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="keySkills.maxWords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Words</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-keyskills-max-words"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Technical Skills Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Technical Skills (Prose Paragraph)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="technicalSkills.minWords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Words</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-techskills-min-words"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="technicalSkills.maxWords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Words</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-techskills-max-words"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Experience Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Experience Achievements</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Most Recent Role</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="experience.mostRecentRole.minBullets"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Bullets</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-recent-min-bullets"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="experience.mostRecentRole.maxBullets"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Bullets</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-recent-max-bullets"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Second Role</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="experience.secondRole.minBullets"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Bullets</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-second-min-bullets"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="experience.secondRole.maxBullets"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Bullets</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-second-max-bullets"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Older Roles</h4>
                    <FormField
                      control={form.control}
                      name="experience.olderRoles.bulletsPerRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bullets Per Role</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              className="max-w-xs"
                              data-testid="input-older-bullets"
                            />
                          </FormControl>
                          <FormDescription>
                            Number of achievement bullets for each older role
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Evaluation Criteria */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Evaluation Criteria</h3>
                <FormField
                  control={form.control}
                  name="evaluationCriteria.exactCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Criteria</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          className="max-w-xs"
                          data-testid="input-criteria-count"
                        />
                      </FormControl>
                      <FormDescription>
                        Exactly how many evaluation criteria should be generated (e.g., 7)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetToDefaults}
                  data-testid="button-reset-defaults"
                >
                  Reset to Defaults
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  data-testid="button-save-preferences"
                >
                  {saveMutation.isPending ? "Saving..." : "Save Preferences"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
