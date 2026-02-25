import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

type Role = "subscriber" | "employee" | "admin" | "attorney";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If provided, only users with one of these roles can access this route */
  allowedRoles?: Role[];
}

/**
 * Returns the default home path for a given role.
 */
export function getRoleDashboard(role: string): string {
  if (role === "admin") return "/admin";
  if (role === "attorney") return "/attorney";
  if (role === "employee") return "/employee";
  return "/dashboard"; // subscriber default
}

/**
 * ProtectedRoute — wraps pages that require authentication.
 *
 * Behaviour:
 * - Unauthenticated → redirect to /login
 * - Authenticated but email unverified → redirect to /verify-email (resend form)
 * - Authenticated but wrong role → redirect to the user's correct dashboard
 * - Authenticated + correct role → render children
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      navigate("/login");
      return;
    }

    // Gate: email must be verified before accessing the app
    // Admins are always pre-verified; skip gate for them
    if (user.role !== "admin" && !(user as any).emailVerified) {
      navigate("/verify-email");
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role as Role)) {
      // Redirect to the user's correct dashboard
      navigate(getRoleDashboard(user.role));
    }
  }, [loading, isAuthenticated, user, allowedRoles, navigate]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Block unverified users (non-admin)
  if (user.role !== "admin" && !(user as any).emailVerified) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role as Role)) {
    return null;
  }

  return <>{children}</>;
}
