import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LandingPage } from "./pages/LandingPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { StudioPage } from "./pages/StudioPage";

// Initialize TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Retrieve Clerk Publishable Key
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_placeholder_key";

function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Protected Dashboard Page */}
            <Route
              path="/projects"
              element={
                <>
                  <SignedIn>
                    <ProjectsPage />
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn signInForceRedirectUrl="/projects" />
                  </SignedOut>
                </>
              }
            />

            {/* Protected Studio Page with dynamic project context */}
            <Route
              path="/project/:projectId"
              element={
                <>
                  <SignedIn>
                    <StudioPage />
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn signInForceRedirectUrl="/projects" />
                  </SignedOut>
                </>
              }
            />

            {/* Redirect old static studio route to projects dashboard */}
            <Route path="/studio" element={<Navigate to="/projects" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
