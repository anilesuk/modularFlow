import { FileText, Home, Plus, User, LogOut, Shield } from "lucide-react";
import { useClerk } from "@clerk/clerk-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { signOut } = useClerk();

  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/submit", label: "New Application", icon: Plus },
    { path: "/profile", label: "Profiles", icon: User },
    { path: "/settings", label: "Settings", icon: Shield },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location === "/";
    }
    return location.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer hover-elevate px-2 py-1 rounded-md" data-testid="link-brand">
                <FileText className="h-7 w-7 text-primary" />
                <h1 className="text-xl font-semibold">CV Tailoring Pro</h1>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive(item.path) ? "secondary" : "ghost"}
                    size="sm"
                    data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                    className="space-x-2"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Secure</span>
            </div>
            
            {user && (
              <div className="flex items-center space-x-3">
                <div className="text-sm text-right hidden md:block">
                  <div className="font-medium" data-testid="text-user-name">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.email}
                  </div>
                </div>
                
                {user.profileImageUrl && (
                  <img
                    src={user.profileImageUrl}
                    alt="Profile"
                    className="h-8 w-8 rounded-full object-cover"
                    data-testid="img-user-avatar"
                  />
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void signOut()}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="ml-2 hidden md:inline">Sign Out</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-border">
          <nav className="max-w-7xl mx-auto px-6 py-2 flex items-center space-x-1 overflow-x-auto">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  size="sm"
                  className="space-x-2"
                  data-testid={`nav-mobile-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card mt-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-primary" />
              <span className="font-semibold">CV Tailoring Pro</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <span className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Enterprise Security</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
