import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  ChevronRight,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  Users,
  X,
  AlertCircle,
  ClipboardList,
  PlusCircle,
  Briefcase,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function getNavItems(role: string): NavItem[] {
  if (role === "subscriber") {
    return [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "Submit Letter", href: "/submit", icon: <PlusCircle className="w-4 h-4" /> },
      { label: "My Letters", href: "/letters", icon: <FileText className="w-4 h-4" /> },
      { label: "Billing", href: "/subscriber/billing", icon: <CreditCard className="w-4 h-4" /> },
    ];
  }
  if (role === "employee") {
    return [
      { label: "Review Center", href: "/review", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "Queue", href: "/review/queue", icon: <ClipboardList className="w-4 h-4" /> },
    ];
  }
  if (role === "admin") {
    return [
      { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "All Letters", href: "/admin/letters", icon: <FileText className="w-4 h-4" /> },
      { label: "Users", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
      { label: "Failed Jobs", href: "/admin/jobs", icon: <AlertCircle className="w-4 h-4" /> },
    ];
  }
  return [];
}

function getRoleLabel(role: string): { label: string; color: string } {
  if (role === "admin") return { label: "Admin", color: "bg-red-100 text-red-700" };
  if (role === "employee") return { label: "Attorney", color: "bg-blue-100 text-blue-700" };
  return { label: "Subscriber", color: "bg-green-100 text-green-700" };
}

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumb?: { label: string; href?: string }[];
}

export default function AppLayout({ children, title, breadcrumb }: AppLayoutProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: notifications } = trpc.notifications.list.useQuery(
    { unreadOnly: true },
    { enabled: isAuthenticated, refetchInterval: 30000 }
  );
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => toast.success("All notifications marked as read"),
    onError: () => toast.error("Failed to mark notifications as read"),
  });
  const unreadCount = notifications?.length ?? 0;

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">Please sign in to access this page.</p>
          <div className="flex gap-3">
            <Button asChild size="lg" variant="outline" className="flex-1">
              <a href="/login">Sign In</a>
            </Button>
            <Button asChild size="lg" className="flex-1 bg-indigo-600 hover:bg-indigo-700">
              <a href="/signup">Create Account</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = getNavItems(user.role);
  const roleInfo = getRoleLabel(user.role);

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sidebar-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">⚖</span>
          </div>
          <div>
            <p className="text-sidebar-foreground font-bold text-sm leading-tight">Talk to My</p>
            <p className="text-sidebar-primary font-bold text-sm leading-tight">Lawyer</p>
          </div>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
            <span className="text-sidebar-foreground font-semibold text-sm">
              {(user.name ?? user.email ?? "U")[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sidebar-foreground font-medium text-sm truncate">{user.name ?? "User"}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleInfo.color}`}>
              {roleInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => { toast.info("Signing out..."); logout(); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar border-r border-sidebar-border fixed inset-y-0 left-0 z-30">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-sidebar flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-sidebar-foreground hover:text-sidebar-primary"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-card border-b border-border px-4 lg:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Breadcrumb */}
            {breadcrumb && breadcrumb.length > 0 ? (
              <nav className="flex items-center gap-1 text-sm">
                {breadcrumb.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                    {crumb.href ? (
                      <Link href={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-foreground font-medium">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            ) : title ? (
              <h1 className="text-sm font-semibold text-foreground">{title}</h1>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <span className="font-semibold text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="text-xs text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {notifications && notifications.length > 0 ? (
                  notifications.slice(0, 5).map((n) => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-3 cursor-pointer">
                      <span className="font-medium text-sm">{n.title}</span>
                      {n.body && <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No new notifications
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
