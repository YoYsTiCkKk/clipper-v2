import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, Scissors, Calendar, Loader2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const feed = useQuery(api.portfolio.getGlobalFeed);
  const toggleSaveStyleMutation = useMutation(api.portfolio.toggleSaveStyle);

  const toggleSave = async (imageId) => {
    if (!user) {
      toast.error("Inicia sesión para guardar estilos");
      navigate("/auth");
      return;
    }
    
    try {
      const res = await toggleSaveStyleMutation({ image_id: imageId });
      if (res.saved) {
        toast.success("Estilo guardado");
      } else {
        toast.info("Estilo eliminado de guardados");
      }
    } catch {
      toast.error("Hubo un problema al guardar");
    }
  };

  if (feed === undefined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-3xl mx-auto px-4 pt-12">
        <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: "Syne" }}>
          Inspiración
        </h1>
        <p className="text-zinc-500 text-sm mb-8">
          Descubre los mejores cortes de los barberos en tu zona.
        </p>

        {feed.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">Aún no hay estilos publicados.</div>
        ) : (
          <div className="columns-2 md:columns-3 gap-4 space-y-4">
            {feed.map((item) => {
              const imgUrl = item.url?.startsWith("/api") ? `${process.env.REACT_APP_BACKEND_URL}${item.url}` : item.url;
              const isSaved = user?.saved_styles?.includes(item.image_id);

              return (
                <div key={item.image_id || Math.random()} className="break-inside-avoid relative group rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
                  <img src={imgUrl} alt="Corte" className="w-full object-cover" loading="lazy" />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <p className="text-xs font-medium text-white line-clamp-2 mb-3">{item.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <Link to={`/barber/${item.barber_id}`} className="flex items-center gap-2 hover:opacity-80">
                        {item.barber_avatar ? (
                          <img src={item.barber_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400">
                            {item.barber_name[0]}
                          </div>
                        )}
                        <span className="text-xs font-semibold text-zinc-300">{item.barber_name}</span>
                      </Link>

                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.preventDefault(); toggleSave(item.image_id); }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            isSaved ? 'bg-amber-500 text-black' : 'bg-black/50 text-white hover:bg-zinc-800'
                          }`}
                        >
                          <Heart className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
                        </button>
                        <Link 
                          to={`/barber/${item.barber_id}`}
                          className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center hover:bg-amber-600 transition-colors"
                        >
                          <Calendar className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
