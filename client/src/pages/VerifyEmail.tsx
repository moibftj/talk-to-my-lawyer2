import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle, XCircle, Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const LOGO_URL = "https://cdn.manus.im/projects/kkQq7ndgQAuTkTV73VVbNP/uploads/logo.png";

type VerifyState = "loading" | "success" | "error" | "resend";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      // No token — show resend form
      setState("resend");
      return;
    }

    // Verify the token
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          setState("success");
        } else {
          setErrorMessage(data.error || "Verification failed. The link may have expired.");
          setState("error");
        }
      })
      .catch(() => {
        setErrorMessage("Network error. Please try again.");
        setState("error");
      });
  }, []);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    setResendLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendSent(true);
        toast.success("Verification email sent", { description: data.message });
      } else {
        toast.error(data.error || "Failed to resend verification email");
      }
    } catch {
        toast.error("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <div className="inline-flex items-center gap-3 cursor-pointer">
              <img src={LOGO_URL} alt="Talk to My Lawyer" className="w-12 h-12 object-contain" />
              <span className="text-xl font-bold text-slate-800">Talk to My Lawyer</span>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Loading */}
          {state === "loading" && (
            <>
              <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Verifying your email…</h1>
              <p className="text-slate-500">Please wait while we confirm your address.</p>
            </>
          )}

          {/* Success */}
          {state === "success" && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Email Verified!</h1>
              <p className="text-slate-600 mb-6">
                Your email address has been confirmed. Your account is now active and ready to use.
              </p>
              <Button
                onClick={() => setLocation("/login")}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Sign In to Your Account
              </Button>
            </>
          )}

          {/* Error */}
          {state === "error" && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Verification Failed</h1>
              <p className="text-slate-600 mb-6">{errorMessage}</p>
              <Button
                variant="outline"
                onClick={() => setState("resend")}
                className="w-full mb-3"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Request a New Verification Link
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full text-indigo-600">
                  Back to Sign In
                </Button>
              </Link>
            </>
          )}

          {/* Resend form */}
          {state === "resend" && (
            <>
              <Mail className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Resend Verification Email</h1>
              {resendSent ? (
                <>
                  <p className="text-green-600 mb-6">
                    A new verification link has been sent to <strong>{resendEmail}</strong>. Please check your inbox.
                  </p>
                  <Link href="/login">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                      Back to Sign In
                    </Button>
                  </Link>
                </>
              ) : (
                <form onSubmit={handleResend} className="text-left mt-4">
                  <p className="text-slate-500 text-sm mb-4 text-center">
                    Enter your email address and we'll send you a new verification link.
                  </p>
                  <div className="mb-4">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={resendLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {resendLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                    ) : (
                      "Send Verification Email"
                    )}
                  </Button>
                  <Link href="/login">
                    <Button variant="ghost" className="w-full mt-2 text-slate-600">
                      Back to Sign In
                    </Button>
                  </Link>
                </form>
              )}
            </>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Need help?{" "}
          <a href="mailto:support@talk-to-my-lawyer.com" className="text-indigo-600 hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
