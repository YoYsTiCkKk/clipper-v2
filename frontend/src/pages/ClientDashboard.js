import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Logo } from "@/components/Logo";
import { MapPin, LogOut, Search, Clock, Check, Send, ChevronRight, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const bookings = useQuery(api.bookings.getMyBookings) || [];
  const updateStatus = useMutation(api.bookings.updateStatus);

  if (!user) return null;

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
          <span className="text-xl font-bold" style={{ fontFamily: "Syne" }}>Trimmer</span>
        </div>
        <button onClick={logout} className="p-2 border border-zinc-800 rounded-full text-zinc-400 hover:text-red-500">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col gap-6 max-w-4xl mx-auto w-full">
        {/* Profile Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex items-center gap-4">
          <img src={user.picture || "https://picsum.photos/100"} alt="User" className="w-16 h-16 rounded-full" />
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-zinc-400">{user.email}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button onClick={() => navigate("/explore")} className="flex-1 h-14 bg-amber-500 text-black hover:bg-amber-600 rounded-2xl text-lg font-bold">
            <Search className="mr-2" /> Buscar Peluqueros
          </Button>
        </div>

        {/* Bookings */}
        <div>
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
        </div>
      </main>
    </div>
  );
}
