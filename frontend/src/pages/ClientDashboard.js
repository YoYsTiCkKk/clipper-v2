import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Calendar, Clock, MapPin, Scissors, LogOut,
  ChevronRight, Search, Gift, Copy, Star, Send
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
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
  const { user, logout, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [referral, setReferral] = useState(null);
  const [refCodeInput, setRefCodeInput] = useState("");
  const [reviewData, setReviewData] = useState({});
  const [showRefInput, setShowRefInput] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (user.role === "barber") { navigate("/dashboard"); return; }
    (async () => {
      try {
        const [bRes, rRes] = await Promise.all([
          axios.get(`${API}/bookings`, { withCredentials: true }),
          axios.get(`${API}/referral/code`, { withCredentials: true }),
        ]);
        setBookings(bRes.data);
        setReferral(rRes.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [user, navigate, authLoading]);

  const handleCancel = async (bookingId) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}/status`, { status: "cancelled" }, { withCredentials: true });
      setBookings((prev) => prev.map((b) => b.booking_id === bookingId ? { ...b, status: "cancelled" } : b));
      toast.success("Reserva cancelada");
    } catch { /* ignore */ }
  };

  const handleReview = async (booking) => {
    const data = reviewData[booking.booking_id];
    if (!data?.rating) { toast.error("Selecciona una puntuacion"); return; }
    try {
      await axios.post(`${API}/reviews`, {
        barber_id: booking.barber_id, booking_id: booking.booking_id,
        rating: data.rating, comment: data.comment || "",
      }, { withCredentials: true });
      toast.success("Resena enviada");
      setReviewData((prev) => ({ ...prev, [booking.booking_id]: { ...prev[booking.booking_id], sent: true } }));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al enviar resena");
    }
  };

  const handleApplyRef = async () => {
    if (!refCodeInput.trim()) return;
    try {
      const res = await axios.post(`${API}/referral/apply`, { referral_code: refCodeInput }, { withCredentials: true });
      toast.success(res.data.message);
      setShowRefInput(false);
      const rRes = await axios.get(`${API}/referral/code`, { withCredentials: true });
      setReferral(rRes.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Codigo no valido");
    }
  };

  const copyCode = () => {
    if (referral?.referral_code) {
      navigator.clipboard.writeText(referral.referral_code);
      toast.success("Codigo copiado");
    }
  };

  const handleLogout = async () => { await logout(); navigate("/"); };

  const upcoming = bookings.filter((b) => b.status === "pending" || b.status === "confirmed");
  const past = bookings.filter((b) => b.status === "completed" || b.status === "cancelled");

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="glass border-b border-zinc-800 sticky top-0 z-30">
        <div className="container mx-auto px-4 max-w-3xl flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Logo className="w-5 h-5 text-amber-500" />
            <span className="text-lg font-bold text-white" style={{ fontFamily: "Syne" }}>Mis Reservas</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button data-testid="client-logout-btn" onClick={handleLogout}>
              <LogOut className="w-5 h-5 text-zinc-500 hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl py-6">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Syne" }}>
            Hola, {user.name?.split(" ")[0]}
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {upcoming.length > 0
              ? `Tienes ${upcoming.length} reserva${upcoming.length > 1 ? "s" : ""} proxima${upcoming.length > 1 ? "s" : ""}`
              : "No tienes reservas pendientes"}
          </p>
        </div>

        {/* Referral Card */}
        {referral && (
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-sm">Invita amigos y gana 5€</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Comparte tu codigo. Ambos recibireis 5€ de credito.</p>
                <div className="flex items-center gap-2 mt-2">
                  <code className="text-amber-500 font-bold text-sm bg-zinc-900 px-3 py-1 rounded-lg">{referral.referral_code}</code>
                  <button data-testid="copy-referral-code" onClick={copyCode} className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                  <span>{referral.completed_referrals} referidos completados</span>
                  <span className="text-amber-500 font-medium">{(referral.credits || 0).toFixed(2)}€ credito</span>
                </div>
              </div>
            </div>
            {!user.referred_by && !showRefInput && (
              <button data-testid="show-ref-input" onClick={() => setShowRefInput(true)} className="text-xs text-amber-500 hover:underline mt-2 ml-13">
                Tengo un codigo de referido
              </button>
            )}
            {showRefInput && (
              <div className="flex gap-2 mt-3 ml-13">
                <Input data-testid="ref-code-input" value={refCodeInput} onChange={(e) => setRefCodeInput(e.target.value.toUpperCase())} placeholder="CLIPXXXXXX" className="bg-zinc-900 border-zinc-700 text-white text-sm h-8" />
                <Button data-testid="apply-ref-btn" onClick={handleApplyRef} className="bg-amber-500 text-black hover:bg-amber-600 h-8 text-xs rounded-lg">Aplicar</Button>
              </div>
            )}
          </div>
        )}

        {/* Quick Action */}
        <Button data-testid="find-barber-btn" onClick={() => navigate("/explore")} className="w-full rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/30 text-left h-auto py-4 px-5 mb-6" variant="ghost">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Search className="w-5 h-5 text-amber-500" /></div>
              <div><p className="text-white font-medium">Buscar barbero</p><p className="text-xs text-zinc-500">Encuentra barberos cerca de ti</p></div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </div>
        </Button>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div className="mb-8">
                <h2 className="text-base md:text-lg font-bold text-white mb-4" style={{ fontFamily: "Syne" }}>Proximas</h2>
                <div className="space-y-3">
                  {upcoming.map((b) => (
                    <div key={b.booking_id} data-testid={`booking-${b.booking_id}`} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div><p className="text-white font-medium">{b.service_name}</p><p className="text-sm text-zinc-400">{b.barber_name}</p></div>
                        <Badge className={statusMap[b.status]?.class}>{statusMap[b.status]?.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-500 mb-3">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-amber-500 font-bold" style={{ fontFamily: "Syne" }}>{b.total_amount?.toFixed(2)}€</span>
                        {b.status !== "cancelled" && (
                          <Button data-testid={`cancel-booking-${b.booking_id}`} variant="ghost" onClick={() => handleCancel(b.booking_id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm h-8 px-3">Cancelar</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past */}
            {past.length > 0 && (
              <div>
                <h2 className="text-base md:text-lg font-bold text-white mb-4" style={{ fontFamily: "Syne" }}>Historial</h2>
                <div className="space-y-3">
                  {past.map((b) => {
                    const rd = reviewData[b.booking_id] || {};
                    return (
                      <div key={b.booking_id} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-zinc-300 font-medium">{b.service_name}</p>
                            <p className="text-sm text-zinc-500">{b.barber_name}</p>
                            <p className="text-xs text-zinc-600 mt-1 flex items-center gap-2"><Calendar className="w-3 h-3" />{b.date}<Clock className="w-3 h-3" />{b.time}</p>
                          </div>
                          <Badge className={statusMap[b.status]?.class}>{statusMap[b.status]?.label}</Badge>
                        </div>
                        {b.status === "completed" && !rd.sent && (
                          <div className="mt-3 pt-3 border-t border-zinc-800">
                            <p className="text-xs text-zinc-400 mb-2">Deja una resena:</p>
                            <div className="flex items-center gap-1 mb-2">
                              {[1,2,3,4,5].map((s) => (
                                <button key={s} data-testid={`review-star-${b.booking_id}-${s}`} onClick={() => setReviewData((p) => ({...p, [b.booking_id]: {...p[b.booking_id], rating: s}}))} >
                                  <Star className={`w-5 h-5 transition-colors ${s <= (rd.rating || 0) ? "text-amber-500 fill-amber-500" : "text-zinc-600 hover:text-zinc-400"}`} />
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Input data-testid={`review-comment-${b.booking_id}`} value={rd.comment || ""} onChange={(e) => setReviewData((p) => ({...p, [b.booking_id]: {...p[b.booking_id], comment: e.target.value}}))} placeholder="Comentario opcional..." className="bg-zinc-800 border-zinc-700 text-white text-sm h-8 placeholder:text-zinc-600" />
                              <Button data-testid={`review-submit-${b.booking_id}`} onClick={() => handleReview(b)} className="bg-amber-500 text-black hover:bg-amber-600 h-8 text-xs rounded-lg px-3"><Send className="w-3 h-3" /></Button>
                            </div>
                          </div>
                        )}
                        {rd.sent && <p className="text-xs text-green-500 mt-2">Resena enviada</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {bookings.length === 0 && (
              <div className="text-center py-16">
                <Logo className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">Aun no tienes reservas</p>
                <Button data-testid="empty-explore-btn" onClick={() => navigate("/explore")} className="mt-4 rounded-full bg-amber-500 text-black hover:bg-amber-600">Buscar barberos</Button>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
