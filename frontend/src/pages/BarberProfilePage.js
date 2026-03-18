import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Star, MapPin, Clock, ArrowLeft, Phone, Scissors,
  CreditCard, ChevronRight, Image as ImageIcon, MessageSquare, Send
} from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BarberProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/barbers/${id}`);
        setBarber(res.data);
        const revRes = await axios.get(`${API}/barbers/${id}/reviews`);
        setReviews(revRes.data);
      } catch {
        navigate("/explore");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!barber) return null;

  const profile = barber.barber_profile || {};
  const services = profile.services || [];
  const portfolio = profile.portfolio || [];

  const handleBook = (serviceId) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate(`/booking/${barber.user_id}`, { state: { serviceId } });
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="relative">
        {portfolio.length > 0 ? (
          <img
            src={portfolio[0].url}
            alt="Cover"
            className="w-full h-56 md:h-72 object-cover opacity-60"
          />
        ) : (
          <div className="w-full h-56 md:h-72 bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 to-zinc-950" />
        <button
          data-testid="barber-back-btn"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 glass rounded-full p-2 hover:bg-zinc-700/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="container mx-auto px-4 md:px-6 max-w-3xl -mt-20 relative z-10">
        {/* Profile Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <img
              src={barber.picture || "https://via.placeholder.com/80"}
              alt={barber.name}
              className="w-20 h-20 rounded-xl object-cover border-2 border-amber-500/50 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h1
                data-testid="barber-name"
                className="text-2xl font-bold text-white truncate"
                style={{ fontFamily: "Syne" }}
              >
                {barber.name}
              </h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <Badge className="bg-amber-500/10 text-amber-500 border-0">
                  <Star className="w-3 h-3 fill-amber-500 mr-1" />
                  {profile.rating || 0} ({profile.review_count || 0})
                </Badge>
                <span className="text-sm text-zinc-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {profile.address || "Sin ubicacion"}
                </span>
              </div>
              {barber.phone && (
                <span className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3" />
                  {barber.phone}
                </span>
              )}
            </div>
          </div>
          {profile.bio && (
            <p className="text-zinc-400 text-sm leading-relaxed mt-4">{profile.bio}</p>
          )}
        </div>

        {/* Services */}
        <div className="mb-6">
          <h2
            className="text-xl font-bold text-white mb-4"
            style={{ fontFamily: "Syne" }}
          >
            Servicios
          </h2>
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.service_id}
                data-testid={`service-${service.service_id}`}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between hover:border-amber-500/30 transition-colors cursor-pointer"
                onClick={() => handleBook(service.service_id)}
              >
                <div className="flex-1">
                  <p className="text-white font-medium">{service.name}</p>
                  <p className="text-sm text-zinc-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {service.duration} min
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-amber-500 font-bold text-lg" style={{ fontFamily: "Syne" }}>
                    {service.price.toFixed(0)}€
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio */}
        {portfolio.length > 0 && (
          <div className="mb-6">
            <h2
              className="text-xl font-bold text-white mb-4 flex items-center gap-2"
              style={{ fontFamily: "Syne" }}
            >
              <ImageIcon className="w-5 h-5 text-amber-500" />
              Trabajos realizados
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {portfolio.map((img) => (
                <button
                  key={img.image_id}
                  data-testid={`portfolio-${img.image_id}`}
                  onClick={() => setSelectedImage(img)}
                  className="relative aspect-square rounded-xl overflow-hidden group"
                >
                  <img
                    src={img.url.startsWith("/api") ? `${process.env.REACT_APP_BACKEND_URL}${img.url}` : img.url}
                    alt={img.description}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                  {img.description && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs">{img.description}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <Separator className="bg-zinc-800 my-6" />

        {/* Reviews */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2" style={{ fontFamily: "Syne" }}>
            <MessageSquare className="w-5 h-5 text-amber-500" />
            Resenas ({reviews.length})
          </h2>
          {reviews.length === 0 ? (
            <p className="text-zinc-500 text-sm">Este barbero aun no tiene resenas.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.review_id} data-testid={`review-${rev.review_id}`} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {rev.client_picture ? (
                        <img src={rev.client_picture} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">
                          {rev.client_name?.[0]}
                        </div>
                      )}
                      <span className="text-sm font-medium text-white">{rev.client_name}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className={`w-3 h-3 ${s <= rev.rating ? "text-amber-500 fill-amber-500" : "text-zinc-600"}`} />
                      ))}
                    </div>
                  </div>
                  {rev.comment && <p className="text-sm text-zinc-400">{rev.comment}</p>}
                  <p className="text-[10px] text-zinc-600 mt-2">
                    {new Date(rev.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sticky Book Button */}
        <div className="pb-8">
          <Button
            data-testid="book-barber-btn"
            onClick={() => handleBook(services[0]?.service_id)}
            disabled={services.length === 0}
            className="w-full rounded-full bg-amber-500 text-black hover:bg-amber-600 h-12 text-base font-semibold"
          >
            <Scissors className="w-5 h-5 mr-2" />
            Reservar cita
          </Button>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage.url.startsWith("/api") ? `${process.env.REACT_APP_BACKEND_URL}${selectedImage.url}` : selectedImage.url}
            alt={selectedImage.description}
            className="max-w-full max-h-[80vh] object-contain rounded-xl"
          />
          {selectedImage.description && (
            <p className="absolute bottom-10 text-white text-center">{selectedImage.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
