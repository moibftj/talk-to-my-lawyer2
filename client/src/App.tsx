import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";

// Auth pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";

// Public pages
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import FAQ from "./pages/FAQ";

// Subscriber pages
import SubscriberDashboard from "./pages/subscriber/Dashboard";
import SubmitLetter from "./pages/subscriber/SubmitLetter";
import MyLetters from "./pages/subscriber/MyLetters";
import LetterDetail from "./pages/subscriber/LetterDetail";
import Billing from "./pages/subscriber/Billing";

// Employee pages
import EmployeeDashboard from "./pages/employee/Dashboard";
import ReviewQueue from "./pages/employee/ReviewQueue";
import ReviewDetail from "./pages/employee/ReviewDetail";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminJobs from "./pages/admin/Jobs";
import AdminAllLetters from "./pages/admin/AllLetters";
import AdminLetterDetail from "./pages/admin/LetterDetail";

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/faq" component={FAQ} />

      {/* Auth */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />

      {/* Subscriber — role-gated */}
      <Route path="/dashboard">
        <ProtectedRoute allowedRoles={["subscriber"]}>
          <SubscriberDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/submit">
        <ProtectedRoute allowedRoles={["subscriber"]}>
          <SubmitLetter />
        </ProtectedRoute>
      </Route>
      <Route path="/letters">
        <ProtectedRoute allowedRoles={["subscriber"]}>
          <MyLetters />
        </ProtectedRoute>
      </Route>
      <Route path="/letters/:id">
        <ProtectedRoute allowedRoles={["subscriber"]}>
          <LetterDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/subscriber/billing">
        <ProtectedRoute allowedRoles={["subscriber"]}>
          <Billing />
        </ProtectedRoute>
      </Route>

      {/* Employee / Attorney — role-gated */}
      <Route path="/review">
        <ProtectedRoute allowedRoles={["employee", "admin"]}>
          <EmployeeDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/review/queue">
        <ProtectedRoute allowedRoles={["employee", "admin"]}>
          <ReviewQueue />
        </ProtectedRoute>
      </Route>
      <Route path="/review/:id">
        <ProtectedRoute allowedRoles={["employee", "admin"]}>
          <ReviewDetail />
        </ProtectedRoute>
      </Route>

      {/* Admin — role-gated */}
      <Route path="/admin">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminUsers />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/jobs">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminJobs />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/letters">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminAllLetters />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/letters/:id">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminLetterDetail />
        </ProtectedRoute>
      </Route>

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
