import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import StudentPortal from "./pages/StudentPortal";
import TeacherPortal from "./pages/TeacherPortal";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/about"} component={Home} />
      <Route path={"/academics"} component={Home} />
      <Route path={"/gallery"} component={Home} />
      <Route path={"/events"} component={Home} />
      <Route path={"/payment"} component={Home} />
      <Route path={"/complaint"} component={Home} />
      <Route path={"/student"} component={StudentPortal} />
      <Route path={"/student-portal"} component={StudentPortal} />
      <Route path={"/teacher"} component={TeacherPortal} />
      <Route path={"/teacher-portal"} component={TeacherPortal} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/admin-login"} component={AdminLogin} />
      <Route path={"/admin-dashboard"} component={AdminDashboard} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
