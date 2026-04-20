import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { LogOut, User, Mail, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";

export default function ClientProfilePage() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    if (user.role === "barber") { navigate("/dashboard", { replace: true }); return; }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between glass z-10 sticky top-0 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <Logo className="w-6 h-6 text-amber-500" />
          <span className="text-lg font-bold" style={{ fontFamily: "Syne" }}>Mi Perfil</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center py-6">
          <img
            src={user.picture || "https://picsum.photos/100"}
            alt={user.name}
            className="w-20 h-20 rounded-full border-2 border-amber-500/30 mb-3"
          />
          <h1 className="text-xl font-bold" style={{ fontFamily: "Syne" }}>{user.name}</h1>
          <p className="text-zinc-500 text-sm flex items-center gap-1.5 mt-1">
            <Mail className="w-3.5 h-3.5" />{user.email}
          </p>
        </div>

        {/* Menu Items */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
          <button
            onClick={() => navigate("/bookings")}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-white">Mis Reservas</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </button>

          <button
            onClick={() => navigate("/explore")}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-white">Buscar Barberos</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </button>
        </div>

        {/* Logout */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full h-12 rounded-full border-red-500/30 text-red-400 hover:bg-red-500/10 font-medium"
        >
          <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
