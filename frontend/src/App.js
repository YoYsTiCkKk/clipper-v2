import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthCallback } from "@/components/AuthCallback";
import { Toaster } from "@/components/ui/sonner";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import MapSearchPage from "@/pages/MapSearchPage";
import BarberProfilePage from "@/pages/BarberProfilePage";
import BookingPage from "@/pages/BookingPage";
import ClientDashboard from "@/pages/ClientDashboard";
import BarberDashboard from "@/pages/BarberDashboard";
import PaymentSuccess from "@/pages/PaymentSuccess";

function AppRouter() {
  const location = useLocation();

  // CRITICAL: Check hash for session_id BEFORE routes render (prevents OAuth race conditions)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/explore" element={<MapSearchPage />} />
      <Route path="/barber/:id" element={<BarberProfilePage />} />
      <Route path="/booking/:barberId" element={<BookingPage />} />
      <Route path="/bookings" element={<ClientDashboard />} />
      <Route path="/dashboard" element={<BarberDashboard />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
