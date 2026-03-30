import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Calendar, User, Scissors } from "lucide-react";

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const clientItems = [
    { icon: Search, label: "Explorar", path: "/explore" },
    { icon: Calendar, label: "Reservas", path: "/bookings" },
    { icon: User, label: "Perfil", path: "/bookings" },
  ];

  const barberItems = [
    { icon: Scissors, label: "Panel", path: "/dashboard" },
    { icon: Search, label: "Explorar", path: "/explore" },
    { icon: User, label: "Perfil", path: "/dashboard" },
  ];

  const items = user?.role === "barber" ? barberItems : clientItems;
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[1000] glass border-t border-zinc-800/50 h-16 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-full max-w-lg mx-auto">
        {items.map((item) => (
          <button
            key={item.path + item.label}
            data-testid={`nav-${item.label.toLowerCase()}`}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 py-2 px-4 transition-colors ${
              isActive(item.path) ? "text-amber-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
            {isActive(item.path) && (
              <div className="w-1 h-1 rounded-full bg-amber-500 -mt-0.5" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
