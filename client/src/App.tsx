import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import DashboardCustomers from "@/pages/dashboard-customers";
import DashboardVehicles from "@/pages/dashboard-vehicles";
import DashboardServices from "@/pages/dashboard-services";
import DashboardSchedule from "@/pages/dashboard-schedule";
import Customers from "@/pages/customers";
import Vehicles from "@/pages/vehicles";
import Services from "@/pages/services";
import Schedule from "@/pages/schedule";
import ReportsPage from "@/pages/reports";
import VehicleHistory from "@/pages/vehicle-history";
import VehiclePhotos from "@/pages/vehicle-photos";
import ServicePhotos from "@/pages/service-photos";

import Admin from "@/pages/admin";
import Notifications from "@/pages/notifications";
import OCRPlateReader from "@/pages/ocr-plate-reader";
import NotFoundPage from "@/pages/not-found";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthGuard } from "@/lib/auth-guard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <Route path="/">
            <AuthGuard />
          </Route>
          <Route path="/auth" component={AuthPage} />
          <Route path="/dashboard">
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard/customers">
            <ProtectedRoute>
              <DashboardCustomers />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard/vehicles">
            <ProtectedRoute>
              <DashboardVehicles />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard/services">
            <ProtectedRoute>
              <DashboardServices />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard/schedule">
            <ProtectedRoute>
              <DashboardSchedule />
            </ProtectedRoute>
          </Route>
          <Route path="/services">
            <ProtectedRoute>
              <Services />
            </ProtectedRoute>
          </Route>
          <Route path="/customers">
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          </Route>
          <Route path="/vehicles">
            <ProtectedRoute>
              <Vehicles />
            </ProtectedRoute>
          </Route>
          <Route path="/schedule">
            <ProtectedRoute>
              <Schedule />
            </ProtectedRoute>
          </Route>
          <Route path="/reports">
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          </Route>
          <Route path="/vehicle-history">
            <ProtectedRoute>
              <VehicleHistory />
            </ProtectedRoute>
          </Route>
          <Route path="/vehicle-photos">
            <ProtectedRoute>
              <VehiclePhotos />
            </ProtectedRoute>
          </Route>
          <Route path="/service-photos">
            <ProtectedRoute>
              <ServicePhotos />
            </ProtectedRoute>
          </Route>

          <Route path="/admin">
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          </Route>
          <Route path="/notifications">
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          </Route>
          <Route path="/ocr-plate-reader">
            <ProtectedRoute>
              <OCRPlateReader />
            </ProtectedRoute>
          </Route>
          <Route component={NotFoundPage} />
        </Switch>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;