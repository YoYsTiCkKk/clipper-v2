import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Logo } from "@/components/Logo";
import { Clock, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";

export default function ClientDashboard() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const bookings = useQuery(api.bookings.getMyBookings) || [];
  const updateStatus = useMutation(api.bookings.updateStatus);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    // Si es barbero, mandarlo a su panel
    if (user.role === "barber") { navigate("/dashboard", { replace: true }); return; }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleCancel = async (id) => {
    if (window.confirm("¿Seguro que quieres cancelar esta reserva?")) {
      await updateStatus({ booking_id: id, status: "cancelled" });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between glass z-10 sticky top-0 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <Logo className="w-8 h-8 text-amber-500" />
          <span className="text-xl font-bold" style={{ fontFamily: "Syne" }}>Mis Reservas</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col gap-6 max-w-4xl mx-auto w-full pb-24">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "Syne" }}>Mis Reservas</h2>
          {bookings.length === 0 ? (
            <p className="text-zinc-500">No tienes reservas activas.</p>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <div key={b._id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">{b.service_name} con {b.barber_name}</h3>
                    <p className="text-zinc-400 text-sm flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4" /> {b.date} a las {b.time}
                    </p>
                    <p className={`text-sm mt-2 font-medium ${b.status === "cancelled" ? "text-red-500" : "text-amber-500"}`}>
                      Estado: {b.status.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <span className="text-xl font-bold">{b.total_amount}€</span>
                    {b.status !== "cancelled" && b.status !== "completed" && (
                      <button onClick={() => handleCancel(b._id)} className="text-red-500 text-sm hover:underline mt-2">
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </main>

      <BottomNav />
    </div>
  );
}
