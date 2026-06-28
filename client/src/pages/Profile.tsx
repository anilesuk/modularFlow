import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { User, Plus, Edit, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertCandidateSchema, type Candidate, type InsertCandidate } from "@shared/schema";
import { z } from "zod";
import { CvSettingsDialog } from "@/components/CvSettingsDialog";

export default function Profile() {
  const { toast } = useToast();
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [deletingCandidate, setDeletingCandidate] = useState<Candidate | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [settingsCandidate, setSettingsCandidate] = useState<Candidate | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const { data: candidates = [], isLoading } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  // Frontend form schema omits userId (added by backend)
  const frontendCandidateSchema = insertCandidateSchema.omit({ userId: true });
  type FrontendCandidate = z.infer<typeof frontendCandidateSchema>;

  const form = useForm<FrontendCandidate>({
    resolver: zodResolver(frontendCandidateSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      cityRegion: "",
      linkedin: "",
      longformCv: "",
      defaultFont: "Arial",
      defaultFontSize: 11,
      defaultMarginsCm: "2.5",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FrontendCandidate) => {
      const res = await apiRequest("POST", "/api/candidates", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Profile Created",
        description: "Your candidate profile has been created successfully.",
      });
      setShowDialog(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FrontendCandidate }) => {
      const res = await apiRequest("PATCH", `/api/candidates/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Profile Updated",
        description: "Your candidate profile has been updated successfully.",
      });
      setShowDialog(false);
      setEditingCandidate(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/candidates/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Profile Deleted",
        description: "The candidate profile has been deleted.",
      });
      setDeletingCandidate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    setEditingCandidate(null);
    form.reset({
      fullName: "",
      email: "",
      phone: "",
      cityRegion: "",
      linkedin: "",
      longformCv: "",
      defaultFont: "Arial",
      defaultFontSize: 11,
      defaultMarginsCm: "2.5",
    });
    setShowDialog(true);
  };

  const handleEdit = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    form.reset({
      fullName: candidate.fullName,
      email: candidate.email,
      phone: candidate.phone || "",
      cityRegion: candidate.cityRegion || "",
      linkedin: candidate.linkedin || "",
      longformCv: candidate.longformCv,
      defaultFont: candidate.defaultFont,
      defaultFontSize: candidate.defaultFontSize,
      defaultMarginsCm: candidate.defaultMarginsCm,
    });
    setShowDialog(true);
  };

  const onSubmit = (data: FrontendCandidate) => {
    if (editingCandidate) {
      updateMutation.mutate({ id: editingCandidate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Candidate Profiles</h1>
            <p className="text-muted-foreground">
              Manage your CV profiles for tailored job applications
            </p>
          </div>
          <Button onClick={handleCreate} data-testid="button-create-profile">
            <Plus className="h-4 w-4 mr-2" />
            Create Profile
          </Button>
        </div>

        {candidates.length === 0 ? (
          <Card className="p-12 text-center">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No profiles yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first candidate profile to start tailoring CVs
            </p>
            <Button onClick={handleCreate} data-testid="button-create-first">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Profile
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <Card key={candidate.id} className="p-6 hover-elevate" data-testid={`card-profile-${candidate.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2" data-testid={`text-name-${candidate.id}`}>
                      {candidate.fullName}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
                      <div data-testid={`text-email-${candidate.id}`}>Email: {candidate.email}</div>
                      {candidate.phone && <div data-testid={`text-phone-${candidate.id}`}>Phone: {candidate.phone}</div>}
                      {candidate.cityRegion && <div data-testid={`text-location-${candidate.id}`}>Location: {candidate.cityRegion}</div>}
                      {candidate.linkedin && <div data-testid={`text-linkedin-${candidate.id}`}>LinkedIn: {candidate.linkedin}</div>}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Long-form CV:</span> {candidate.longformCv.substring(0, 200)}...
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSettingsCandidate(candidate);
                        setShowSettings(true);
                      }}
                      data-testid={`button-settings-${candidate.id}`}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(candidate)}
                      data-testid={`button-edit-${candidate.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeletingCandidate(candidate)}
                      data-testid={`button-delete-${candidate.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCandidate ? "Edit Profile" : "Create New Profile"}
              </DialogTitle>
              <DialogDescription>
                {editingCandidate 
                  ? "Update your candidate profile information"
                  : "Add a new candidate profile with your full career details"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-full-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cityRegion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City/Region (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="linkedin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn URL (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} data-testid="input-linkedin" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longformCv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Long-form CV</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={8}
                          placeholder="Paste your complete career history, achievements, and experience details here. This will be used by AI to generate tailored CVs."
                          data-testid="input-longform-cv"
                        />
                      </FormControl>
                      <FormDescription>
                        Include all your work experience, skills, and achievements. The more detail, the better.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDialog(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editingCandidate
                      ? "Update Profile"
                      : "Create Profile"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingCandidate} onOpenChange={() => setDeletingCandidate(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Profile?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the profile for{" "}
                <strong>{deletingCandidate?.fullName}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingCandidate && deleteMutation.mutate(deletingCandidate.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* CV Generation Settings */}
        <CvSettingsDialog
          candidate={settingsCandidate}
          open={showSettings}
          onOpenChange={setShowSettings}
        />
      </div>
    </div>
  );
}
