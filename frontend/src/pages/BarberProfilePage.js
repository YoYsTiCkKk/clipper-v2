import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Star, MapPin, Clock, ArrowLeft, Phone, Scissors,
  CreditCard, ChevronRight, ChevronLeft, Image as ImageIcon, MessageSquare, Send, Play
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function BarberProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Lightbox post state (null = closed)
  const [selectedPost, setSelectedPost] = useState(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  
  const barber = useQuery(api.users.getBarber, { barber_id: id });
  const reviews = useQuery(api.reviews.getBarberReviews, { barber_id: id }) || [];
  
  const loading = barber === undefined;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!barber) return null;

  const profile = barber.barber_profile || {};
  const services = useQuery(api.services.getBarberServices, { barber_id: barber.user_id }) || [];
  const portfolio = useQuery(api.portfolio.getBarberPortfolio, { barber_id: barber.user_id }) || [];

  const handleBook = (serviceId) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate(`/booking/${barber.user_id}`, { state: { serviceId } });
  };

  const openLightbox = (post) => {
    setSelectedPost(post);
    setMediaIndex(0);
  };

  const nextMedia = (e) => {
    e.stopPropagation();
    const len = selectedPost.media?.length || 1;
    setMediaIndex((prev) => (prev + 1) % len);
  };

  const prevMedia = (e) => {
    e.stopPropagation();
    const len = selectedPost.media?.length || 1;
    setMediaIndex((prev) => (prev - 1 + len) % len);
  };

  const selectedMediaList = selectedPost?.media?.length > 0
    ? selectedPost.media
    : [{ url: selectedPost?.url, type: "image", isLegacy: true }];

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header Cover */}
      <div className="relative">
        {portfolio.length > 0 ? (
          <div className="w-full h-56 md:h-72 object-cover opacity-60 bg-zinc-900 flex items-center justify-center overflow-hidden">
             {(() => {
                const firstPost = portfolio[0];
                const count = firstPost.media?.length || 0;
                const m = count > 0 ? firstPost.media[0] : { url: firstPost.url, type: "image" };
                return m.type === "video" ? (
                  <video src={m.url} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                ) : (
                  <img src={m.url} alt="Cover" className="w-full h-full object-cover" />
                );
             })()}
          </div>
        ) : (
          <div className="w-full h-56 md:h-72 bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 to-zinc-950" />
        <button
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
              <h1 className="text-2xl font-bold text-white truncate" style={{ fontFamily: "Syne" }}>
                {barber.name}
              </h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <Badge className="bg-amber-500/10 text-amber-500 border-0">
                  <Star className="w-3 h-3 fill-amber-500 mr-1" />
                  {profile.rating || 0} ({profile.review_count || 0})
                </Badge>
                <span className="text-sm text-zinc-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {profile.address || "Sin ubicacion local"}
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
          <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: "Syne" }}>
            Servicios
          </h2>
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service._id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between hover:border-amber-500/30 transition-colors cursor-pointer"
                onClick={() => handleBook(service._id)}
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

        {/* Portfolio Muro */}
        {portfolio.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2" style={{ fontFamily: "Syne" }}>
              <ImageIcon className="w-5 h-5 text-amber-500" />
              Trabajos realizados
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {portfolio.map((post) => {
                const mediaCount = post.media?.length || 0;
                const firstMedia = mediaCount > 0 ? post.media[0] : { url: post.url, type: 'image' };
                const isVideo = firstMedia.type === "video";
                
                return (
                  <button
                    key={post._id}
                    onClick={() => openLightbox(post)}
                    className="relative aspect-square rounded-xl overflow-hidden group bg-zinc-900 border border-zinc-800"
                  >
                    {isVideo ? (
                      <video src={firstMedia.url} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" muted loop playsInline />
                    ) : (
                      <img src={firstMedia.url} alt={post.description || "Corte"} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                    )}
                    
                    {/* Media Type Badges */}
                    {mediaCount > 1 && (
                      <div className="absolute top-2 right-2 bg-black/60 rounded-md px-1.5 py-0.5 text-xs font-bold flex items-center gap-1 text-white z-10">
                         <ImageIcon className="w-3 h-3" /> {mediaCount}
                      </div>
                    )}
                    {isVideo && mediaCount <= 1 && (
                      <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1 z-10 text-white">
                         <Play className="w-3 h-3" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors z-20" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Separator className="bg-zinc-800 my-6" />

        {/* Reviews */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2" style={{ fontFamily: "Syne" }}>
            <MessageSquare className="w-5 h-5 text-amber-500" />
            Reseñas ({reviews.length})
          </h2>
          {reviews.length === 0 ? (
            <p className="text-zinc-500 text-sm">Este barbero aún no tiene reseñas.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev._id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
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

        <div className="pb-8">
          <Button
            onClick={() => handleBook(services[0]?._id)}
            disabled={services.length === 0}
            className="w-full rounded-full bg-amber-500 text-black hover:bg-amber-600 h-12 text-base font-semibold"
          >
            <Scissors className="w-5 h-5 mr-2" />
            Reservar cita rápida
          </Button>
        </div>
      </div>

      {/* Lightbox / Carousel */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedPost(null)}
        >
          {/* Close Btn */}
          <button className="absolute top-4 right-4 text-white/50 hover:text-white p-2">
             <ArrowLeft className="w-6 h-6 rotate-180" />
          </button>

          <div className="relative w-full max-w-4xl flex items-center justify-center flex-1">
             {/* Carousel Media */}
             {selectedMediaList[mediaIndex].type === "video" ? (
               <video 
                 src={selectedMediaList[mediaIndex].url}
                 controls
                 autoPlay
                 className="max-w-full max-h-[75vh] object-contain rounded-xl"
                 onClick={(e) => e.stopPropagation()}
               />
             ) : (
               <img
                 src={selectedMediaList[mediaIndex].url}
                 alt="Portfolio detail"
                 className="max-w-full max-h-[75vh] object-contain rounded-xl"
                 onClick={(e) => e.stopPropagation()}
               />
             )}

             {/* Arrows */}
             {selectedMediaList.length > 1 && (
                <>
                  <button onClick={prevMedia} className="absolute left-0 md:-left-12 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button onClick={nextMedia} className="absolute right-0 md:-right-12 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  
                  {/* Indicators */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-zinc-900/50 px-3 py-1.5 rounded-full">
                    {selectedMediaList.map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all ${i === mediaIndex ? "w-4 bg-amber-500" : "w-1.5 bg-white/30"}`} />
                    ))}
                  </div>
                </>
             )}
          </div>
          
          {selectedPost.description && (
            <p className="absolute bottom-6 md:bottom-10 text-white/90 text-sm max-w-lg text-center px-4">
               {selectedPost.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
