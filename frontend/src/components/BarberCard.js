import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, Scissors } from "lucide-react";

export function BarberCard({ barber }) {
  const navigate = useNavigate();
  const profile = barber.barber_profile || {};
  const services = profile.services || [];
  const cheapest = services.length > 0
    ? services.reduce((a, b) => (a.price < b.price ? a : b))
    : null;

  return (
    <div
      data-testid={`barber-card-${barber.user_id}`}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
      onClick={() => navigate(`/barber/${barber.user_id}`)}
    >
      <div className="flex sm:flex-col">
        {/* Image */}
        <div className="w-28 sm:w-full aspect-square flex-shrink-0">
          <img
            src={barber.picture || "https://via.placeholder.com/200"}
            alt={barber.name}
            className="w-full h-full object-cover"
          />
        </div>
        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-white font-bold text-sm truncate">{barber.name}</h3>
            <Badge className="bg-amber-500/10 text-amber-500 border-0 text-xs ml-2 flex-shrink-0">
              <Star className="w-3 h-3 fill-amber-500 mr-0.5" />
              {profile.rating || 0}
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 flex items-center gap-1 mb-2">
            <MapPin className="w-3 h-3" />
            {profile.address?.split(",")[0] || "Sin ubicacion"}
          </p>
          {cheapest && (
            <p className="text-xs text-zinc-400 mb-3">
              Desde <span className="text-amber-500 font-semibold">{cheapest.price.toFixed(0)}€</span>
            </p>
          )}
          <Button
            data-testid={`book-${barber.user_id}`}
            className="w-full rounded-full bg-amber-500 text-black hover:bg-amber-600 h-8 text-xs font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/barber/${barber.user_id}`);
            }}
          >
            <Scissors className="w-3 h-3 mr-1" />
            Reservar
          </Button>
        </div>
      </div>
    </div>
  );
}
