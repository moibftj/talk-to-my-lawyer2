import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ArrowRight,
  Shield,
  FileText,
  Play,
  Settings2,
  Zap,
  Copy,
  Share2,
  History,
  HelpCircle,
  Menu,
  X,
} from "lucide-react";

const LOGO_URL =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699538fe166a21e073a8647e/ef385eee8_TALK_LOGO-removebg-preview.png";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "employee") navigate("/review");
      else navigate("/dashboard");
    }
  }, [loading, isAuthenticated, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const goToLogin = () => {
    navigate("/login");
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={LOGO_URL}
              alt="Talk to My Lawyer"
              className="w-10 h-10 object-contain"
            />
            <span className="font-bold text-slate-900 text-base hidden sm:block">
              Talk-To-My-Lawyer
            </span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => scrollTo("features")}
              className="text-slate-600 hover:text-slate-900 text-sm font-medium hidden sm:block"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo("pricing")}
              className="text-slate-600 hover:text-slate-900 text-sm font-medium hidden sm:block"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollTo("faq")}
              className="text-slate-600 hover:text-slate-900 text-sm font-medium hidden sm:block"
            >
              FAQ
            </button>
            <button
              onClick={goToLogin}
              className="text-slate-600 hover:text-slate-900 text-sm font-medium hidden sm:block"
            >
              Sign In
            </button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 h-9 text-sm font-semibold hidden sm:flex items-center gap-2"
              onClick={goToLogin}
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
            {/* Mobile hamburger */}
            <button
              className="sm:hidden p-2 text-slate-600 hover:text-slate-900"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-3">
            <button
              onClick={() => { scrollTo("features"); setMobileMenuOpen(false); }}
              className="block w-full text-left text-slate-700 text-sm font-medium py-2 hover:text-blue-600"
            >
              Features
            </button>
            <button
              onClick={() => { scrollTo("pricing"); setMobileMenuOpen(false); }}
              className="block w-full text-left text-slate-700 text-sm font-medium py-2 hover:text-blue-600"
            >
              Pricing
            </button>
            <button
              onClick={() => { scrollTo("faq"); setMobileMenuOpen(false); }}
              className="block w-full text-left text-slate-700 text-sm font-medium py-2 hover:text-blue-600"
            >
              FAQ
            </button>
            <div className="pt-2 flex flex-col gap-2">
              <Button variant="outline" className="w-full" onClick={goToLogin}>
                Sign In
              </Button>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={goToLogin}>
                Get Started
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section
        className="pt-16 min-h-[90vh] flex items-center"
        style={{
          background:
            "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 40%, #dbeafe 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-20 text-center w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/70 border border-blue-200 rounded-full px-4 py-1.5 mb-8 text-sm text-blue-700 font-medium shadow-sm">
            <span className="w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
            AI-Powered · Attorney-Reviewed · Guaranteed Quality
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 mb-4 leading-tight tracking-tight">
            Get professional{" "}
            <span className="text-blue-500">Lawyer-Drafted</span>
            <br />
            letters for
          </h1>

          {/* Letter type pills */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-8 mt-6">
            {[
              "Breach of Contract",
              "Demand for Payment",
              "Cease and Desist",
              "Pre-Litigation Settlement",
              "Debt Collection",
            ].map((name) => (
              <button
                key={name}
                onClick={goToLogin}
                className="bg-white/80 border border-slate-200 text-slate-700 text-sm font-medium px-4 py-1.5 rounded-full shadow-sm hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                {name}
              </button>
            ))}
            <span className="bg-white/80 border border-slate-200 text-slate-700 text-sm font-medium px-4 py-1.5 rounded-full shadow-sm cursor-default">
              And more
            </span>
          </div>

          <p className="text-slate-700 text-lg mb-10 font-medium">
            Resolve conflicts quickly and affordably — only{" "}
            <span className="text-blue-600 font-bold">$200 per letter.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base font-semibold rounded-xl shadow-lg shadow-blue-200 flex items-center gap-2"
              onClick={goToLogin}
            >
              <Play className="w-4 h-4" fill="white" /> Create Your Letter{" "}
              <Settings2 className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-white px-8 h-12 text-base font-semibold rounded-xl flex items-center gap-2 bg-white/60"
              onClick={() => scrollTo("faq")}
            >
              <HelpCircle className="w-4 h-4" /> View FAQs{" "}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-600">
            {[
              { icon: CheckCircle2, label: "PDF Download" },
              { icon: CheckCircle2, label: "Up to 48 hours turnaround" },
              { icon: CheckCircle2, label: "Attorney approved" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <item.icon className="w-4 h-4 text-green-500" />
                <span className="font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="features" className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-3">
              How It Works
            </h2>
            <p className="text-slate-500 text-lg">
              Simple, fast, and professionally verified in 3 steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: FileText,
                title: "Submit Your Case",
                desc: "Fill out our simple intake form with your legal matter details. Choose from 5 professional letter types tailored to your situation.",
              },
              {
                step: "02",
                icon: Shield,
                title: "AI Drafts Instantly",
                desc: "Our advanced AI generates a professional, legally-sound letter tailored to your exact situation in seconds.",
              },
              {
                step: "03",
                icon: CheckCircle2,
                title: "Attorney Approves",
                desc: "A licensed attorney personally reviews, edits, and approves every letter before you receive it. Guaranteed quality.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-slate-50 rounded-2xl p-8 border border-slate-200 shadow-sm relative group hover:shadow-md transition-shadow"
              >
                <div className="absolute -top-4 -left-4 w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-sm font-bold">
                    {item.step}
                  </span>
                </div>
                <item.icon className="w-10 h-10 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-500 leading-relaxed text-sm">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-3">
              Comprehensive Legal Tools
            </h2>
            <p className="text-slate-500 text-lg">
              Everything you need to manage your legal matters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 border border-slate-200 rounded-xl bg-white hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">
                Document Management
              </h3>
              <p className="text-sm text-slate-600">
                Upload, organize, and securely store all your legal documents
                with version control and access tracking.
              </p>
            </div>

            <div className="p-6 border border-slate-200 rounded-xl bg-white hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">
                AI Document Analysis
              </h3>
              <p className="text-sm text-slate-600">
                Get instant AI-powered insights and analysis of your legal
                documents with key findings and recommendations.
              </p>
            </div>

            <div className="p-6 border border-slate-200 rounded-xl bg-white hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                <Copy className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">
                Template Library
              </h3>
              <p className="text-sm text-slate-600">
                Access a curated library of professional legal templates tailored
                to your jurisdiction and needs.
              </p>
            </div>

            <div className="p-6 border border-slate-200 rounded-xl bg-white hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">
                Secure Sharing
              </h3>
              <p className="text-sm text-slate-600">
                Safely share documents with legal professionals with granular
                access controls and expiring links.
              </p>
            </div>

            <div className="p-6 border border-slate-200 rounded-xl bg-white hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <History className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">
                Version Control
              </h3>
              <p className="text-sm text-slate-600">
                Track all changes, restore previous versions, and maintain a
                complete audit trail of your documents.
              </p>
            </div>

            <div className="p-6 border border-slate-200 rounded-xl bg-white hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">
                Bank-Level Security
              </h3>
              <p className="text-sm text-slate-600">
                Your documents are encrypted and stored securely with full
                compliance to data protection regulations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="py-24 px-4"
        style={{
          background: "linear-gradient(135deg, #eef2ff 0%, #dbeafe 100%)",
        }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-slate-600 text-lg mb-3">
            Start with one letter or unlock unlimited access
          </p>
          <p className="text-blue-600 text-sm mb-12 font-semibold">
            Have a referral code? Get 20% off any plan!
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              {
                plan: "Single Letter",
                price: "$200",
                desc: "One complete legal letter",
                sub: "or $160 with referral code",
                highlight: false,
              },
              {
                plan: "Membership",
                price: "$200/mo",
                desc: "$50 per letter, unlimited",
                sub: "or $160/mo with referral code",
                highlight: true,
              },
              {
                plan: "Annual",
                price: "$2,000/yr",
                desc: "48 letters per year",
                sub: "or $1,600/yr with referral code",
                highlight: false,
              },
            ].map((tier) => (
              <div
                key={tier.plan}
                className={`rounded-2xl p-6 border ${
                  tier.highlight
                    ? "border-blue-500 bg-blue-600 text-white shadow-xl shadow-blue-200"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                {tier.highlight && (
                  <div className="text-blue-200 text-xs font-bold mb-2 tracking-widest">
                    MOST POPULAR
                  </div>
                )}
                <h3
                  className={`font-bold text-lg mb-1 ${
                    tier.highlight ? "text-white" : "text-slate-900"
                  }`}
                >
                  {tier.plan}
                </h3>
                <div
                  className={`text-3xl font-bold mb-1 ${
                    tier.highlight ? "text-white" : "text-slate-900"
                  }`}
                >
                  {tier.price}
                </div>
                <p
                  className={`text-sm mb-1 ${
                    tier.highlight ? "text-blue-100" : "text-slate-500"
                  }`}
                >
                  {tier.desc}
                </p>
                <p
                  className={`text-xs ${
                    tier.highlight ? "text-blue-200" : "text-slate-400"
                  }`}
                >
                  {tier.sub}
                </p>
              </div>
            ))}
          </div>
          <Button
            size="lg"
            className="mt-10 bg-blue-600 hover:bg-blue-700 text-white px-10 h-12 text-lg shadow-lg rounded-xl"
            onClick={goToLogin}
          >
            Get Started Today <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>
      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              <HelpCircle className="w-4 h-4" />
              FAQ
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-500 text-lg">
              Everything you need to know about our legal letter service
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {[
              {
                q: "What is Talk to My Lawyer?",
                a: "Talk to My Lawyer is an AI-powered legal letter drafting service with mandatory attorney review. You submit your legal matter, our AI researches applicable laws and drafts a professional letter, and then a licensed attorney reviews, edits, and approves the final document.",
              },
              {
                q: "How much does a letter cost?",
                a: "A single attorney-reviewed legal letter costs $200. This covers AI-powered legal research, professional letter drafting, licensed attorney review and editing, and a downloadable PDF of the final approved letter. We also offer subscription plans for multiple letters per month.",
              },
              {
                q: "How long does it take to receive my letter?",
                a: "Most letters are delivered within 24\u201348 hours of payment. The AI drafting stage typically completes within 2\u20135 minutes. Attorney review is the primary variable \u2014 attorneys aim to complete reviews within 24 hours during business days.",
              },
              {
                q: "Are these letters legally valid?",
                a: "Yes. All letters are reviewed and approved by licensed attorneys. They are professionally drafted legal correspondence you can use in real-world situations. However, a legal letter is not a court filing or legal judgment \u2014 it is formal written communication that asserts your legal position.",
              },
              {
                q: "What types of legal letters can I get?",
                a: "We support Demand Letters, Cease and Desist Notices, Contract Breach Letters, Eviction Notices, Employment Dispute Letters, Consumer Complaint Letters, and General Legal Correspondence. More letter types are added regularly.",
              },
              {
                q: "Who reviews my letter?",
                a: "Every letter is reviewed by a licensed attorney before delivery. Attorneys review the AI-generated draft, make any necessary edits, and either approve, reject, or request changes. You only receive a letter that has been explicitly approved by a licensed attorney.",
              },
              {
                q: "Can I see the AI draft before paying?",
                a: "Yes. After the AI completes drafting, you can preview a partially blurred version of your letter. To unlock the full letter and submit it for attorney review, you pay the $200 fee at that point.",
              },
              {
                q: "Is my information confidential?",
                a: "Absolutely. All information you provide is treated as confidential. We use industry-standard encryption for data in transit and at rest. Attorneys who review your letters are bound by professional confidentiality obligations.",
              },
            ].map((item, idx) => (
              <AccordionItem
                key={idx}
                value={`faq-${idx}`}
                className="border border-slate-200 rounded-xl px-5 data-[state=open]:border-blue-200 data-[state=open]:bg-blue-50/30 transition-colors"
              >
                <AccordionTrigger className="text-left text-sm font-semibold text-slate-900 hover:no-underline py-4">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-slate-600 leading-relaxed pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="text-center mt-10">
            <Button asChild variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
              <Link href="/faq">
                View All FAQs <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-slate-900 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="Talk to My Lawyer"
              className="w-10 h-10 object-contain"
            />
            <span className="text-white font-semibold">
              Talk to My Lawyer
            </span>
          </div>
          <div className="flex items-center gap-6 text-slate-400 text-sm">
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
            <button onClick={goToLogin} className="hover:text-white transition-colors">Sign In</button>
          </div>
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Talk to My Lawyer.
          </p>
        </div>
      </footer>
    </div>
  );
}
