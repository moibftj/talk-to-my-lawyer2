import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Scale, Eye, EyeOff, Loader2, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Signup() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [signedUpEmail, setSignedUpEmail] = useState("");

  const passwordChecks = {
    length: password.length >= 6,
    match: password === confirmPassword && confirmPassword.length > 0,
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Helper to make signup request with timeout
      const doSignup = async (attempt: number) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
          const resp = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name: name || undefined }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return resp;
        } catch (err) {
          clearTimeout(timeoutId);
          if (attempt < 2) {
            // Retry once on timeout/network error
            return doSignup(attempt + 1);
          }
          throw err;
        }
      };

      const response = await doSignup(0);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      // Handle email verification required
      if (data.requiresVerification) {
        setSignedUpEmail(email);
        setVerificationSent(true);
        return;
      }

      if (data.needsLogin) {
        toast.success("Account created!", {
          description: "Please sign in with your new credentials.",
        });
        navigate("/login");
        return;
      }

      // Store the access token (owner auto-login path)
      if (data.session?.access_token) {
        localStorage.setItem("sb_access_token", data.session.access_token);
        localStorage.setItem("sb_refresh_token", data.session.refresh_token || "");
      }

      await utils.auth.me.invalidate();

      toast.success("Account created!", {
        description: "Welcome to Talk to My Lawyer.",
      });

      localStorage.removeItem("ttml_onboarding_seen");
      navigate("/dashboard");
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError("Request timed out. Please try again — the server may be warming up.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Show email-sent confirmation screen
  if (verificationSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <img
                src="https://cdn.manus.im/projects/kkQq7ndgQAuTkTV73VVbNP/uploads/logo.png"
                alt="Talk to My Lawyer"
                className="w-12 h-12 object-contain"
              />
              <span className="text-2xl font-bold text-slate-900">Talk to My Lawyer</span>
            </Link>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Check Your Email</h1>
            <p className="text-slate-600 mb-2">
              We sent a verification link to:
            </p>
            <p className="font-semibold text-indigo-700 mb-6 break-all">{signedUpEmail}</p>
            <p className="text-slate-500 text-sm mb-6">
              Click the link in the email to activate your account. The link expires in 24 hours.
            </p>
            <p className="text-slate-400 text-xs mb-4">Didn't receive it? Check your spam folder or</p>
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/auth/resend-verification", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: signedUpEmail }),
                  });
                  const d = await res.json();
                  toast.success(d.message || "Verification email resent!");
                } catch {
                  toast.error("Failed to resend. Please try again.");
                }
              }}
              className="text-indigo-600 hover:underline text-sm font-medium"
            >
              resend the verification email
            </button>
            <div className="mt-6">
              <Link href="/login">
                <Button variant="outline" className="w-full">Back to Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            AI-powered legal letters with mandatory attorney review
          </p>
        </div>

        {/* Signup Card */}
        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Get started with your first legal letter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name <span className="text-slate-400">(optional)</span></Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  disabled={loading}
                />
              </div>

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
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
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
                {password.length > 0 && (
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <Check className={`w-3 h-3 ${passwordChecks.length ? "text-green-500" : "text-slate-300"}`} />
                    <span className={passwordChecks.length ? "text-green-600" : "text-slate-400"}>
                      At least 6 characters
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <Check className={`w-3 h-3 ${passwordChecks.match ? "text-green-500" : "text-slate-300"}`} />
                    <span className={passwordChecks.match ? "text-green-600" : "text-slate-400"}>
                      Passwords match
                    </span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={loading || !passwordChecks.length}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-slate-600">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
