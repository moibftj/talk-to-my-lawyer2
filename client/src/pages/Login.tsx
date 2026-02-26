import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { getRoleDashboard, isRoleAllowedOnPath } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Scale, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [, navigate] = useLocation();
  const search = useSearch();

  const utils = trpc.useUtils();

  // Parse ?next= from query string
  const nextPath = (() => {
    const params = new URLSearchParams(search);
    const raw = params.get("next");
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return null;
    }
  })();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Helper with timeout + retry for cold-start resilience
      const doLogin = async (attempt: number) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
          const resp = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return resp;
        } catch (err) {
          clearTimeout(timeoutId);
          if (attempt < 2) return doLogin(attempt + 1);
          throw err;
        }
      };

      const response = await doLogin(0);
      const data = await response.json();

      if (!response.ok) {
        const msg = data.error || "Login failed. Please check your credentials.";
        setError(msg);
        if (data.code === "EMAIL_NOT_VERIFIED") {
          setShowResendVerification(true);
        }
        toast.error(msg);
        setLoading(false);
        return;
      }

      // Store the access token for tRPC requests
      if (data.session?.access_token) {
        localStorage.setItem("sb_access_token", data.session.access_token);
        localStorage.setItem("sb_refresh_token", data.session.refresh_token || "");
      }

      // Invalidate the auth.me query to refresh user state
      await utils.auth.me.invalidate();

      toast.success("Signed in successfully", {
        description: "Welcome back. Redirecting to your dashboard.",
      });

      // Role-based redirect — honour ?next= if the role is allowed on that path
      const role = data.user?.role ?? data.session?.user?.user_metadata?.role ?? "subscriber";
      if (nextPath && isRoleAllowedOnPath(role, nextPath)) {
        navigate(nextPath);
      } else {
        navigate(getRoleDashboard(role));
      }
    } catch (err: any) {
      const msg = err?.name === 'AbortError'
        ? "Request timed out. Please try again — the server may be warming up."
        : "An unexpected error occurred. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663031738932/OabHhALgbskSzGQq.png"
              alt="Talk to My Lawyer"
              className="w-12 h-12 object-contain"
            />
            <span className="text-2xl font-bold text-slate-900">
              Talk to My Lawyer
            </span>
          </Link>
          <p className="text-slate-500 text-sm">
            Professional legal letters drafted and reviewed by attorneys
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                  {showResendVerification && (
                    <div className="mt-2 pt-2 border-t border-red-200">
                      {resendSent ? (
                        <p className="text-green-700 text-xs font-medium">Verification email sent! Check your inbox.</p>
                      ) : (
                        <button
                          type="button"
                          disabled={resendLoading}
                          onClick={async () => {
                            setResendLoading(true);
                            try {
                              const res = await fetch("/api/auth/resend-verification", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ email }),
                              });
                              const d = await res.json();
                              setResendSent(true);
                              toast.success("Verification email sent", { description: d.message || "Check your inbox." });
                            } catch {
                              toast.error("Could not resend email", { description: "Please try again." });
                            } finally {
                              setResendLoading(false);
                            }
                          }}
                          className="text-indigo-700 hover:underline text-xs font-medium disabled:opacity-50"
                        >
                          {resendLoading ? "Sending…" : "Resend verification email"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              Don't have an account?{" "}
              <Link href="/signup" className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline">
                Create one
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-slate-600">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
