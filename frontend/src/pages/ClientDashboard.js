import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import {
  Calendar, Clock, MapPin, Scissors, LogOut,
  ChevronRight, Search
} from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusMap = {
  pending: { label: "Pendiente", class: "bg-yellow-500/10 text-yellow-500 border-0" },
  confirmed: { label: "Confirmada", class: "bg-green-500/10 text-green-500 border-0" },
  completed: { label: "Completada", class: "bg-zinc-500/10 text-zinc-400 border-0" },
  cancelled: { label: "Cancelada", class: "bg-red-500/10 text-red-400 border-0" },
};

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (user.role === "barber") { navigate("/dashboard"); return; }
    (async () => {
      try {
        const res = await axios.get(`${API}/bookings`, { withCredentials: true });
        setBookings(res.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [user, navigate]);

  const handleCancel = async (bookingId) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}/status`,
        { status: "cancelled" }, { withCredentials: true }
      );
      setBookings((prev) =>
        prev.map((b) => b.booking_id === bookingId ? { ...b, status: "cancelled" } : b)
      );
    } catch { /* ignore */ }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const upcoming = bookings.filter((b) => b.status === "pending" || b.status === "confirmed");
  const past = bookings.filter((b) => b.status === "completed" || b.status === "cancelled");

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="glass border-b border-zinc-800 sticky top-0 z-30">
        <div className="container mx-auto px-4 max-w-3xl flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-amber-500" />
            <span className="text-lg font-bold text-white" style={{ fontFamily: "Syne" }}>
              Mis Reservas
            </span>
          </div>
          <button data-testid="client-logout-btn" onClick={handleLogout}>
            <LogOut className="w-5 h-5 text-zinc-500 hover:text-white transition-colors" />
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl py-6">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Syne" }}>
            Hola, {user.name?.split(" ")[0]}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {upcoming.length > 0
              ? `Tienes ${upcoming.length} reserva${upcoming.length > 1 ? "s" : ""} proxima${upcoming.length > 1 ? "s" : ""}`
              : "No tienes reservas pendientes"}
          </p>
        </div>

        {/* Quick Action */}
        <Button
          data-testid="find-barber-btn"
          onClick={() => navigate("/explore")}
          className="w-full rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/30 text-left h-auto py-4 px-5 mb-8"
          variant="ghost"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-white font-medium">Buscar barbero</p>
                <p className="text-xs text-zinc-500">Encuentra barberos cerca de ti</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </div>
        </Button>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Upcoming Bookings */}
            {upcoming.length > 0 && (
              <div className="mb-8">
                <h2 className="text-base md:text-lg font-bold text-white mb-4" style={{ fontFamily: "Syne" }}>
                  Proximas
                </h2>
                <div className="space-y-3">
                  {upcoming.map((b) => (
                    <div
                      key={b.booking_id}
                      data-testid={`booking-${b.booking_id}`}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-white font-medium">{b.service_name}</p>
                          <p className="text-sm text-zinc-400">{b.barber_name}</p>
                        </div>
                        <Badge className={statusMap[b.status]?.class}>
                          {statusMap[b.status]?.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {b.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {b.time}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-amber-500 font-bold" style={{ fontFamily: "Syne" }}>
                          {b.total_amount?.toFixed(2)}€
                        </span>
                        {b.status !== "cancelled" && (
                          <Button
                            data-testid={`cancel-booking-${b.booking_id}`}
                            variant="ghost"
                            onClick={() => handleCancel(b.booking_id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm h-8 px-3"
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Bookings */}
            {past.length > 0 && (
              <div>
                <h2 className="text-base md:text-lg font-bold text-white mb-4" style={{ fontFamily: "Syne" }}>
                  Historial
                </h2>
                <div className="space-y-3">
                  {past.map((b) => (
                    <div
                      key={b.booking_id}
                      className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 opacity-70"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-zinc-300 font-medium">{b.service_name}</p>
                          <p className="text-sm text-zinc-500">{b.barber_name}</p>
                          <p className="text-xs text-zinc-600 mt-1 flex items-center gap-2">
                            <Calendar className="w-3 h-3" />{b.date}
                            <Clock className="w-3 h-3" />{b.time}
                          </p>
                        </div>
                        <Badge className={statusMap[b.status]?.class}>
                          {statusMap[b.status]?.label}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bookings.length === 0 && (
              <div className="text-center py-16">
                <Scissors className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">Aun no tienes reservas</p>
                <Button
                  data-testid="empty-explore-btn"
                  onClick={() => navigate("/explore")}
                  className="mt-4 rounded-full bg-amber-500 text-black hover:bg-amber-600"
                >
                  Buscar barberos
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
