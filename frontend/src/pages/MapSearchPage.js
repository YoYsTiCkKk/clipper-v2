import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { Search, Star, MapPin, Scissors, X } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function createBarberIcon(picture) {
  return L.divIcon({
    className: "barber-marker-wrap",
    html: `<div class="barber-marker"><img src="${picture || "https://via.placeholder.com/48"}" alt="" /></div>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
}

function FlyToLocation({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 14, { duration: 1.5 });
  }, [center, map]);
  return null;
}

export default function MapSearchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [barbers, setBarbers] = useState([]);
  const [center, setCenter] = useState([40.4168, -3.7038]);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        const res = await axios.get(`${API}/barbers`, {
          params: { lat: center[0], lng: center[1], radius: 50000 },
        });
        setBarbers(res.data);
      } catch (err) {
        console.error("Error loading barbers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBarbers();
  }, [center]);

  const filteredBarbers = useMemo(() => {
    if (!searchQuery) return barbers;
    const q = searchQuery.toLowerCase();
    return barbers.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.barber_profile?.address?.toLowerCase().includes(q) ||
        b.barber_profile?.services?.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [barbers, searchQuery]);

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000]">
        <div className="glass rounded-2xl border border-zinc-800 p-3 max-w-lg mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              data-testid="map-search-input"
              placeholder="Buscar barbero, zona o servicio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500 rounded-xl"
            />
            {searchQuery && (
              <button
                data-testid="map-search-clear"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-zinc-500 hover:text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          />
          <FlyToLocation center={center} />
          {filteredBarbers.map((barber) => {
            const coords = barber.barber_profile?.location?.coordinates;
            if (!coords || (coords[0] === 0 && coords[1] === 0)) return null;
            return (
              <Marker
                key={barber.user_id}
                position={[coords[1], coords[0]]}
                icon={createBarberIcon(barber.picture)}
                eventHandlers={{
                  click: () => setSelectedBarber(barber),
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={barber.picture || "https://via.placeholder.com/40"}
                        alt={barber.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-bold text-sm">{barber.name}</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span className="text-xs">{barber.barber_profile?.rating || 0}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 mb-2">{barber.barber_profile?.address}</p>
                    <button
                      onClick={() => navigate(`/barber/${barber.user_id}`)}
                      className="w-full py-1.5 bg-amber-500 text-black text-xs font-semibold rounded-full hover:bg-amber-600 transition-colors"
                    >
                      Ver perfil
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Selected Barber Card (bottom sheet) */}
      {selectedBarber && (
        <div className="absolute bottom-20 left-4 right-4 z-[1000] animate-slide-in-bottom">
          <div className="glass rounded-2xl border border-zinc-800 p-4 max-w-lg mx-auto">
            <div className="flex items-start gap-4">
              <img
                src={selectedBarber.picture || "https://via.placeholder.com/64"}
                alt={selectedBarber.name}
                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-bold truncate">{selectedBarber.name}</h3>
                  <button
                    data-testid="close-barber-card"
                    onClick={() => setSelectedBarber(null)}
                  >
                    <X className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-0">
                    <Star className="w-3 h-3 fill-amber-500 mr-1" />
                    {selectedBarber.barber_profile?.rating}
                  </Badge>
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedBarber.barber_profile?.address?.split(",")[0]}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap mb-3">
                  {selectedBarber.barber_profile?.services?.slice(0, 2).map((s) => (
                    <span key={s.service_id} className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                      {s.name} · {s.price.toFixed(0)}€
                    </span>
                  ))}
                </div>
                <Button
                  data-testid="view-barber-profile-btn"
                  onClick={() => navigate(`/barber/${selectedBarber.user_id}`)}
                  className="w-full rounded-full bg-amber-500 text-black hover:bg-amber-600 h-9 text-sm font-semibold"
                >
                  <Scissors className="w-4 h-4 mr-2" />
                  Ver perfil y reservar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
