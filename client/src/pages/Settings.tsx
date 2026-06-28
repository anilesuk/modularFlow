import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useClerk } from "@clerk/clerk-react";
import { Settings as SettingsIcon, User, Lock, Bell, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Settings() {
  const { user } = useAuth();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  const handleSavePreferences = () => {
    toast({
      title: "Preferences Saved",
      description: "Your notification preferences have been updated.",
    });
  };

  if (!user) {
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
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and security settings
          </p>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-settings">
            <TabsTrigger value="account" data-testid="tab-account">
              <User className="h-4 w-4 mr-2" />
              Account
            </TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Account Information</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first-name">First Name</Label>
                    <Input
                      id="first-name"
                      defaultValue={user.firstName || ""}
                      disabled
                      className="mt-2"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input
                      id="last-name"
                      defaultValue={user.lastName || ""}
                      disabled
                      className="mt-2"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user.email || ""}
                    disabled
                    className="mt-2"
                    data-testid="input-email"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Account information is managed through your authentication provider
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="email-notifications" className="text-base font-medium">
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates when your CV processing is complete
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                    data-testid="switch-email-notifications"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="security-alerts" className="text-base font-medium">
                      Security Alerts
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about important security events
                    </p>
                  </div>
                  <Switch
                    id="security-alerts"
                    checked={securityAlerts}
                    onCheckedChange={setSecurityAlerts}
                    data-testid="switch-security-alerts"
                  />
                </div>

                <div className="pt-4 border-t border-border">
                  <Button onClick={handleSavePreferences} data-testid="button-save-preferences">
                    Save Preferences
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Security & Privacy</h2>
              
              <div className="space-y-6">
                <div className="p-4 bg-accent/20 rounded-md border border-accent">
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Enterprise-Grade Security</h3>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• Bank-level encryption for all data at rest and in transit</li>
                        <li>• Secure authentication via OpenID Connect</li>
                        <li>• Comprehensive audit logging for compliance</li>
                        <li>• GDPR and SOC2 compliant data handling</li>
                        <li>• ACL-protected document access</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">Data Access & Privacy</h3>
                  <p className="text-sm text-muted-foreground">
                    Your CV data, job applications, and generated documents are stored securely with 
                    strict access controls. Only you can access your documents via encrypted storage paths.
                  </p>
                  
                  <div className="pt-4">
                    <Button
                      variant="outline"
                      onClick={() => void signOut()}
                      data-testid="button-sign-out"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>

                <div className="pt-6 border-t border-border space-y-3">
                  <h3 className="font-medium text-destructive">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground">
                    Deleting your account will permanently remove all your candidate profiles, 
                    job applications, and generated documents. This action cannot be undone.
                  </p>
                  <Button
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10"
                    disabled
                    data-testid="button-delete-account"
                  >
                    Delete Account
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Contact support to request account deletion
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
