import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Scissors, Calendar, Clock, Plus, Trash2, LogOut,
  MapPin, Phone, User, Image as ImageIcon, Save, Loader2, Check, X,
  Upload, CalendarDays, Star, MessageSquare, LayoutDashboard, Zap, Crown, ChevronRight
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";

const statusMap = {
  pending: { label: "Pendiente", class: "bg-yellow-500/10 text-yellow-500 border-0" },
  confirmed: { label: "Confirmada", class: "bg-green-500/10 text-green-500 border-0" },
  completed: { label: "Completada", class: "bg-zinc-500/10 text-zinc-400 border-0" },
  cancelled: { label: "Cancelada", class: "bg-red-500/10 text-red-400 border-0" },
};

const SECTIONS = [
  { id: "bookings", icon: Calendar, label: "Reservas" },
  { id: "services", icon: Scissors, label: "Servicios" },
  { id: "portfolio", icon: ImageIcon, label: "Portfolio" },
  { id: "schedule", icon: CalendarDays, label: "Horarios" },
  { id: "profile", icon: User, label: "Perfil" },
];

export default function BarberDashboard() {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState("bookings");
  
  // Convex Reactivity Queries
  const barberData = useQuery(api.users.getMe);
  const bookings = useQuery(api.bookings.getMyBookings) || [];
  const reviews = useQuery(api.reviews.getBarberReviews, barberData ? { barber_id: barberData.user_id } : "skip") || [];
  const services = useQuery(api.services.getBarberServices, barberData ? { barber_id: barberData.user_id } : "skip") || [];
  const portfolio = useQuery(api.portfolio.getBarberPortfolio, barberData ? { barber_id: barberData.user_id } : "skip") || [];

  // Mutations
  const updateProfile = useMutation(api.users.updateBarberProfile);
  const saveWeeklySchedule = useMutation(api.users.updateWeeklySchedule);
  const updateDateOverride = useMutation(api.users.updateDateOverride);
  const removeDateOverride = useMutation(api.users.removeDateOverride);
  const addServiceObj = useMutation(api.services.addService);
  const removeServiceObj = useMutation(api.services.removeService);
  const updateBookingStatus = useMutation(api.bookings.updateStatus);
  const generateUploadUrl = useMutation(api.portfolio.generateUploadUrl);
  const addPortfolioPost = useMutation(api.portfolio.addPortfolioPost);
  const deletePortfolioPost = useMutation(api.portfolio.deletePortfolioImage);
  const checkAndExpireTrial = useMutation(api.users.checkAndExpireTrial);
  const boostPostMutation = useMutation(api.portfolio.boostPost);
  const subscriptionStatus = useQuery(api.users.getSubscriptionStatus);

  // Plan modal state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [boostingPostId, setBoostingPostId] = useState(null);

  // Component States
  const [newService, setNewService] = useState({ name: "", price: "", duration: "30" });
  
  // Multi-File Upload State
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  
  // URL Upload State
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageDesc, setNewImageDesc] = useState("");

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    name: "", bio: "", address: "", phone: "", useDeviceLocation: false, lat: "", lng: "", offersHomeService: false, homeServiceFee: ""
  });
  const [saving, setSaving] = useState(false);
  
  // Weekly Schedule State
  const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const defaultWeekly = () => {
    const s = {};
    for (let d = 1; d <= 7; d++) {
      s[String(d)] = d <= 5
        ? { available: true, start_hour: 9, end_hour: 19 }
        : d === 6 ? { available: true, start_hour: 10, end_hour: 14 } : { available: false, start_hour: 9, end_hour: 19 };
    }
    return s;
  };
  const [weeklySchedule, setWeeklySchedule] = useState(defaultWeekly());
  const [customSchedule, setCustomSchedule] = useState({});
  const [savingSchedule, setSavingSchedule] = useState(false);
  
  // Date Override Form
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideConfig, setOverrideConfig] = useState({ available: false, start_hour: "9", end_hour: "19" });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    if (user.role !== "barber") { navigate("/bookings", { replace: true }); return; }
    // Check if trial has expired
    checkAndExpireTrial().catch(() => {});
  }, [user, navigate, authLoading]);

  // Sync profile data when Convex query loads
  useEffect(() => {
    if (barberData && barberData.barber_profile) {
      const bp = barberData.barber_profile;
      const coords = bp.location?.coordinates || [0, 0];
      const hasCoords = coords[0] !== 0 || coords[1] !== 0;
      setProfileForm({
        name: barberData.name || "",
        bio: bp.bio || "",
        address: bp.address || "",
        phone: barberData.phone || "",
        useDeviceLocation: hasCoords,
        lat: hasCoords ? String(coords[1]) : "",
        lng: hasCoords ? String(coords[0]) : "",
        offersHomeService: bp.offers_home_service || false,
        homeServiceFee: bp.home_service_fee !== undefined ? String(bp.home_service_fee) : ""
      });
      if (bp.weekly_schedule && Object.keys(bp.weekly_schedule).length > 0) {
        setWeeklySchedule(bp.weekly_schedule);
      }
      setCustomSchedule(bp.custom_schedule || {});
    }
  }, [barberData]);

  // Mostrar spinner mientras auth o datos cargan (DESPUES de todos los hooks)
  if (authLoading || !user || user.role !== "barber") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Handlers
  const handleAddService = async () => {
    if (!newService.name || !newService.price) return;
    try {
      await addServiceObj({
        name: newService.name,
        price: parseFloat(newService.price),
        duration: parseInt(newService.duration) || 30,
      });
      setNewService({ name: "", price: "", duration: "30" });
      toast.success("Servicio agregado");
    } catch (err) { toast.error("Error al agregar servicio"); }
  };

  const handleDeleteService = async (id) => {
    try {
      await removeServiceObj({ id });
      toast.success("Servicio eliminado");
    } catch { toast.error("Error al eliminar"); }
  };

  const handleFileUpload = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    try {
      const mediaArray = [];
      for (const file of uploadFiles) {
        // Generar URL seguro individual para cada archivo en Convex Storage
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        
        mediaArray.push({
          storageId,
          type: file.type.startsWith("video/") ? "video" : "image",
        });
      }
      
      await addPortfolioPost({ description: uploadDesc, media: mediaArray });
      
      setUploadFiles([]);
      setUploadDesc("");
      document.getElementById("portfolio-file-input").value = "";
      toast.success("Publicación multimedia creada");
    } catch (err) {
      console.error(err);
      toast.error("Error al subir contenido");
    } finally { setUploading(false); }
  };

  const handleAddUrlImage = async () => {
    if (!newImageUrl) return;
    try {
      await addPortfolioPost({
        description: newImageDesc,
        media: [{ url: newImageUrl, type: "image" }]
      });
      setNewImageUrl("");
      setNewImageDesc("");
      toast.success("Imagen agregada vía URL");
    } catch { toast.error("Error al publicar URL"); }
  };

  const handleDeletePost = async (id) => {
    try {
      await deletePortfolioPost({ id });
      toast.success("Publicación eliminada");
    } catch { toast.error("Error al eliminar post"); }
  };

  const handleSaveWeeklySchedule = async () => {
    setSavingSchedule(true);
    try {
      await saveWeeklySchedule({ schedule: weeklySchedule });
      toast.success("Horario semanal guardado");
    } catch { toast.error("Error al guardar horario"); }
    finally { setSavingSchedule(false); }
  };

  const updateDay = (dayNum, field, value) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [String(dayNum)]: { ...prev[String(dayNum)], [field]: value }
    }));
  };

  const handleAddDateOverride = async () => {
    if (!overrideDate) { toast.error("Selecciona una fecha"); return; }
    try {
      await updateDateOverride({
        date: overrideDate,
        available: overrideConfig.available,
        start_hour: overrideConfig.available ? parseInt(overrideConfig.start_hour) : undefined,
        end_hour: overrideConfig.available ? parseInt(overrideConfig.end_hour) : undefined,
      });
      toast.success(`Excepción para ${overrideDate} guardada`);
      setOverrideDate("");
    } catch { toast.error("Error al guardar excepción"); }
  };

  const handleRemoveDateOverride = async (dateStr) => {
    try {
      await removeDateOverride({ date: dateStr });
      toast.success(`Excepción de ${dateStr} eliminada`);
    } catch { toast.error("Error al eliminar excepción"); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      let lat = profileForm.lat ? parseFloat(profileForm.lat) : undefined;
      let lng = profileForm.lng ? parseFloat(profileForm.lng) : undefined;

      // Si tiene ubicación del dispositivo activada, obtener coords frescas
      if (profileForm.useDeviceLocation && navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true, timeout: 10000
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          setProfileForm(prev => ({ ...prev, lat: String(lat), lng: String(lng) }));
        } catch {
          // Si falla GPS pero ya tenía coords, usar las anteriores
          if (!lat || !lng) {
            toast.error("No se pudo obtener tu ubicación. Desactiva la opción o acepta permisos GPS.");
            setSaving(false);
            return;
          }
        }
      }

      // Si no usa ubicación del dispositivo, limpiar coords
      if (!profileForm.useDeviceLocation) {
        lat = undefined;
        lng = undefined;
      }

      await updateProfile({
        name: profileForm.name || undefined,
        phone: profileForm.phone || undefined,
        bio: profileForm.bio || undefined,
        address: profileForm.address || undefined,
        offers_home_service: profileForm.offersHomeService,
        home_service_fee: profileForm.offersHomeService ? (parseFloat(profileForm.homeServiceFee) || 0) : undefined,
        lat,
        lng
      });
      toast.success("Perfil actualizado");
    } catch { toast.error("Error al guardar perfil"); }
    finally { setSaving(false); }
  };

  const handleBookingAction = async (bookingId, status) => {
    try {
      await updateBookingStatus({ booking_id: bookingId, status });
      toast.success("Estado actualizado");
    } catch { toast.error("Ups! Algo salió mal"); }
  };

  const handleLogout = async () => { await logout(); navigate("/"); };

  if (!user || user.role !== "barber" || barberData === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === "pending" || b.status === "confirmed");

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="glass border-b border-zinc-800 sticky top-0 z-30">
        <div className="container mx-auto px-4 max-w-4xl flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Logo className="w-5 h-5 text-amber-500" />
            <span className="text-lg font-bold text-white" style={{ fontFamily: "Syne" }}>
              Panel Barbero
            </span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button data-testid="barber-logout-btn" onClick={handleLogout} className="p-2">
              <LogOut className="w-5 h-5 text-zinc-500 hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button onClick={() => setActiveSection("bookings")} className={`bg-zinc-900 border rounded-xl p-4 text-center transition-colors ${activeSection === "bookings" ? "border-amber-500/50" : "border-zinc-800 hover:border-zinc-700"}`}>
            <p className="text-2xl font-bold text-amber-500" style={{ fontFamily: "Syne" }}>
              {pendingBookings.length}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Reservas</p>
          </button>
          <button onClick={() => setActiveSection("services")} className={`bg-zinc-900 border rounded-xl p-4 text-center transition-colors ${activeSection === "services" ? "border-amber-500/50" : "border-zinc-800 hover:border-zinc-700"}`}>
            <p className="text-2xl font-bold text-white" style={{ fontFamily: "Syne" }}>
              {services.length}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Servicios</p>
          </button>
          <button onClick={() => setActiveSection("portfolio")} className={`bg-zinc-900 border rounded-xl p-4 text-center transition-colors ${activeSection === "portfolio" ? "border-amber-500/50" : "border-zinc-800 hover:border-zinc-700"}`}>
            <p className="text-2xl font-bold text-white" style={{ fontFamily: "Syne" }}>
              {portfolio.length}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Posts</p>
          </button>
        </div>

        {/* Subscription Warning Banner */}
        {subscriptionStatus && (() => {
          const { status, trialDaysLeft, limits, usage } = subscriptionStatus;
          const bookingsPct = limits.bookings ? (usage.bookings / limits.bookings) * 100 : 0;
          if (status === "expired" && usage.bookings >= limits.bookings) {
            return (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center justify-between gap-3">
                <p className="text-sm text-red-400">Has alcanzado el límite de reservas este mes. Actualiza tu plan para seguir recibiendo clientes.</p>
                <button onClick={() => setShowPlanModal(true)} className="text-xs bg-amber-500 text-black font-bold px-3 py-1.5 rounded-full whitespace-nowrap">Ver planes</button>
              </div>
            );
          }
          if (status === "trial" && trialDaysLeft !== null && trialDaysLeft <= 7) {
            return (
              <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-3">
                <p className="text-sm text-amber-400">Tu prueba gratuita acaba en <strong>{trialDaysLeft} días</strong>.</p>
                <button onClick={() => setShowPlanModal(true)} className="text-xs bg-amber-500 text-black font-bold px-3 py-1.5 rounded-full whitespace-nowrap">Ver planes</button>
              </div>
            );
          }
          if (status === "expired" && bookingsPct >= 80) {
            return (
              <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-3">
                <p className="text-sm text-amber-400">{usage.bookings}/{limits.bookings} reservas usadas este mes.</p>
                <button onClick={() => setShowPlanModal(true)} className="text-xs bg-amber-500 text-black font-bold px-3 py-1.5 rounded-full whitespace-nowrap">Ampliar</button>
              </div>
            );
          }
          return null;
        })()}

        {/* Active Section Content */}
        {activeSection === "bookings" && (
          <div className="space-y-3 animate-fade-in-up">
            <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: "Syne" }}>
              <Calendar className="w-5 h-5 text-amber-500" /> Reservas
            </h2>
            {bookings.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No tienes reservas activas</p>
            ) : (
              bookings.map((b) => (
                <div key={b._id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium">{b.service_name}</p>
                      <p className="text-sm text-zinc-400">{b.client_name}</p>
                    </div>
                    <Badge className={statusMap[b.status]?.class}>{statusMap[b.status]?.label}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-500 mb-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.time}</span>
                    <span className="text-amber-500 font-medium">{b.total_amount?.toFixed(2)}€</span>
                  </div>
                  {b.status === "pending" && (
                    <div className="flex gap-2">
                      <Button onClick={() => handleBookingAction(b._id, "confirmed")} className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white rounded-full text-sm"><Check className="w-3 h-3 mr-1" />Confirmar</Button>
                      <Button onClick={() => handleBookingAction(b._id, "cancelled")} variant="outline" className="flex-1 h-8 border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-full text-sm"><X className="w-3 h-3 mr-1" />Rechazar</Button>
                    </div>
                  )}
                  {b.status === "confirmed" && (
                    <Button onClick={() => handleBookingAction(b._id, "completed")} className="w-full h-8 bg-amber-500 hover:bg-amber-600 text-black rounded-full text-sm">Marcar como completada</Button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeSection === "services" && (
          <div className="space-y-4 animate-fade-in-up">
            <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: "Syne" }}>
              <Scissors className="w-5 h-5 text-amber-500" /> Servicios
            </h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Agregar servicio</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input placeholder="Nombre del servicio" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
                <Input type="number" placeholder="Precio (€)" value={newService.price} onChange={(e) => setNewService({ ...newService, price: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
                <Input type="number" placeholder="Duracion (min)" value={newService.duration} onChange={(e) => setNewService({ ...newService, duration: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
              </div>
              <Button onClick={handleAddService} className="mt-3 rounded-full bg-amber-500 text-black hover:bg-amber-600 h-9 text-sm"><Plus className="w-4 h-4 mr-1" />Guardar</Button>
            </div>
            <div className="space-y-2">
              {services.map((s) => (
                <div key={s._id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{s.name}</p>
                    <p className="text-sm text-zinc-500">{s.duration} min · {s.price.toFixed(0)}€</p>
                  </div>
                  <button onClick={() => handleDeleteService(s._id)} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "portfolio" && (
          <div className="space-y-4 animate-fade-in-up">
            <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: "Syne" }}>
              <ImageIcon className="w-5 h-5 text-amber-500" /> Portfolio
            </h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-500" />Nueva Publicación
              </h3>
              
              <div className="space-y-3">
                <input
                  id="portfolio-file-input"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                  onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                  className="w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-amber-500/10 file:text-amber-500 file:text-xs file:font-medium hover:file:bg-amber-500/20"
                />
                {uploadFiles.length > 0 && (
                  <p className="text-xs text-amber-500 font-medium">Archivos listos: {uploadFiles.length}</p>
                )}
                <Input placeholder="Descripcion de la publicación (opcional)..." value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
                <Button onClick={handleFileUpload} disabled={uploadFiles.length === 0 || uploading} className="rounded-full bg-amber-500 text-black hover:bg-amber-600 h-9 text-sm">
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Subiendo...</> : <><Upload className="w-4 h-4 mr-1" />Publicar contenido</>}
                </Button>
              </div>

              <Separator className="bg-zinc-800 my-2" />
              
              <div className="space-y-3">
                <p className="text-xs text-zinc-500">O pegar una URL externa</p>
                <div className="flex gap-2">
                  <Input placeholder="URL de la imagen" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
                  <Button onClick={handleAddUrlImage} variant="outline" className="h-10 border-zinc-700 text-white hover:bg-zinc-800"><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>

            {/* Galería (Muro) */}
            {portfolio.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {portfolio.map((post) => {
                  const mediaCount = post.media?.length || 0;
                  const firstMedia = mediaCount > 0 ? post.media[0] : { url: post.url, type: "image" };
                  const isVideo = firstMedia.type === "video";
                  const now = new Date().toISOString();
                  const isBoosted = !!(post.boosted_until && post.boosted_until > now);
                  const boostDaysLeft = isBoosted
                    ? Math.ceil((new Date(post.boosted_until) - new Date()) / 86400000)
                    : 0;
                  
                  return (
                    <div key={post._id} className="relative group rounded-xl overflow-hidden aspect-square bg-zinc-900 border border-zinc-800">
                      {isVideo ? (
                         <video src={firstMedia.url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                      ) : (
                         <img src={firstMedia.url} alt={post.description || "Portfolio"} className="w-full h-full object-cover" />
                      )}
                      
                      {mediaCount > 1 && (
                        <div className="absolute top-2 right-2 bg-black/60 rounded-md px-1.5 py-0.5 text-xs font-bold flex items-center gap-1 text-white z-10">
                           <ImageIcon className="w-3 h-3" /> {mediaCount}
                        </div>
                      )}

                      {isBoosted && (
                        <div className="absolute top-2 left-2 bg-amber-500 rounded-md px-1.5 py-0.5 text-xs font-bold flex items-center gap-1 text-black z-10">
                          <Zap className="w-3 h-3" /> {boostDaysLeft}d
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center gap-2 z-20">
                        {!isBoosted && (
                          <button
                            onClick={() => setBoostingPostId(post._id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500 text-black rounded-full p-2 hover:bg-amber-400"
                            title="Destacar post"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleDeletePost(post._id)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full p-2 hover:bg-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeSection === "schedule" && (
          <div className="space-y-4 animate-fade-in-up">
            <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: "Syne" }}>
              <CalendarDays className="w-5 h-5 text-amber-500" /> Horarios
            </h2>

            {/* Horario semanal recurrente */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300">Horario semanal</h3>
              <p className="text-xs text-zinc-500">Configura tu horario habitual para cada día de la semana.</p>
              
              <div className="space-y-2">
                {DAY_NAMES.map((name, idx) => {
                  const dayNum = idx + 1;
                  const day = weeklySchedule[String(dayNum)] || { available: false, start_hour: 9, end_hour: 19 };
                  return (
                    <div key={dayNum} className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors ${day.available ? 'bg-zinc-800/50' : 'bg-zinc-900'}`}>
                      <label className="flex items-center gap-2 cursor-pointer min-w-[110px]">
                        <input
                          type="checkbox"
                          checked={day.available}
                          onChange={(e) => updateDay(dayNum, 'available', e.target.checked)}
                          className="accent-amber-500 w-4 h-4"
                        />
                        <span className={`text-sm font-medium ${day.available ? 'text-white' : 'text-zinc-500'}`}>{name}</span>
                      </label>
                      {day.available ? (
                        <div className="flex items-center gap-2 flex-1">
                          <select
                            value={day.start_hour}
                            onChange={(e) => updateDay(dayNum, 'start_hour', parseInt(e.target.value))}
                            className="bg-zinc-800 border border-zinc-700 rounded-md text-white text-xs py-1.5 px-2 flex-1"
                          >
                            {Array.from({length: 14}, (_, i) => i + 7).map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
                          </select>
                          <span className="text-zinc-500 text-xs">a</span>
                          <select
                            value={day.end_hour}
                            onChange={(e) => updateDay(dayNum, 'end_hour', parseInt(e.target.value))}
                            className="bg-zinc-800 border border-zinc-700 rounded-md text-white text-xs py-1.5 px-2 flex-1"
                          >
                            {Array.from({length: 14}, (_, i) => i + 8).map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
                          </select>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600 italic">Cerrado</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button onClick={handleSaveWeeklySchedule} disabled={savingSchedule} className="w-full rounded-full bg-amber-500 text-black hover:bg-amber-600 h-10 font-semibold">
                {savingSchedule ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</> : <><Save className="w-4 h-4 mr-2" />Guardar horario semanal</>}
              </Button>
            </div>

            {/* Excepciones por fecha */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300">Excepciones (festivos, días especiales)</h3>
              <p className="text-xs text-zinc-500">Modifica el horario de un día concreto sin cambiar tu horario habitual.</p>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-zinc-300 text-sm mb-1.5 block">Fecha</Label>
                  <Input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={overrideConfig.available} onChange={(e) => setOverrideConfig({...overrideConfig, available: e.target.checked})} className="accent-amber-500" />
                    <span className="text-sm text-zinc-300">{overrideConfig.available ? 'Abierto con horario especial' : 'Cerrado ese día'}</span>
                  </label>
                </div>
                {overrideConfig.available && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-zinc-400 text-xs mb-1 block">Hora inicio</Label>
                      <select value={overrideConfig.start_hour} onChange={(e) => setOverrideConfig({...overrideConfig, start_hour: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm py-2 px-2">
                        {Array.from({length: 14}, (_, i) => i + 7).map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-zinc-400 text-xs mb-1 block">Hora fin</Label>
                      <select value={overrideConfig.end_hour} onChange={(e) => setOverrideConfig({...overrideConfig, end_hour: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm py-2 px-2">
                        {Array.from({length: 14}, (_, i) => i + 8).map(h => <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <Button onClick={handleAddDateOverride} className="w-full rounded-full bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 h-10 font-semibold">
                  <Plus className="w-4 h-4 mr-2" />Añadir excepción
                </Button>
              </div>
            </div>

            {/* Lista de excepciones */}
            {Object.keys(customSchedule).length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Excepciones activas</h3>
                <div className="space-y-2">
                  {Object.entries(customSchedule).sort().map(([date, cfg]) => (
                    <div key={date} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <span className="text-sm text-white">{date}</span>
                      <div className="flex items-center gap-3">
                        {cfg.available ? (
                          <Badge className="bg-green-500/10 text-green-500 border-0 text-xs">{cfg.start_hour}:00 - {cfg.end_hour}:00</Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-400 border-0 text-xs">Cerrado</Badge>
                        )}
                        <button onClick={() => handleRemoveDateOverride(date)} className="text-zinc-600 hover:text-red-400 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === "profile" && (
          <div className="space-y-4 animate-fade-in-up">
            <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: "Syne" }}>
              <User className="w-5 h-5 text-amber-500" /> Mi Perfil
            </h2>
             <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Nombre</Label>
                <Input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Descripción / Bio</Label>
                <textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} rows={3} className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none resize-none" />
              </div>
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Dirección local</Label>
                <Input value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} placeholder="Calle, ciudad" className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
              </div>
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Teléfono (WhatsApp)</Label>
                <Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+34 600..." className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
              </div>
              
              <div className="bg-black/30 p-4 rounded-lg border border-zinc-800">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.useDeviceLocation}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setProfileForm(prev => ({
                        ...prev,
                        useDeviceLocation: checked,
                        ...(checked ? {} : { lat: "", lng: "" })
                      }));
                    }}
                    className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 accent-amber-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-500" />Usar ubicación del dispositivo
                    </span>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {profileForm.useDeviceLocation
                        ? "Los clientes te verán en el mapa por GPS"
                        : "Los clientes verán solo tu dirección escrita"}
                    </p>
                  </div>
                </label>
                {profileForm.useDeviceLocation && profileForm.lat && profileForm.lng && (
                  <p className="text-xs text-zinc-500 mt-2 ml-8">
                    📍 {parseFloat(profileForm.lat).toFixed(5)}, {parseFloat(profileForm.lng).toFixed(5)}
                  </p>
                )}
              </div>

              <div className="bg-black/30 border border-zinc-800 rounded-lg p-4 flex flex-col gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.offersHomeService}
                    onChange={(e) => setProfileForm({ ...profileForm, offersHomeService: e.target.checked })}
                    className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-amber-500"
                  />
                  <span className="text-sm font-medium text-white">Ofrezco servicio a domicilio</span>
                </label>
                {profileForm.offersHomeService && (
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Tarifa de desplazamiento (€)</label>
                    <input
                      type="number"
                      value={profileForm.homeServiceFee}
                      onChange={(e) => setProfileForm({ ...profileForm, homeServiceFee: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none"
                    />
                  </div>
                )}
              </div>

              <Button onClick={handleSaveProfile} disabled={saving} className="w-full rounded-full bg-amber-500 text-black hover:bg-amber-600 h-10 font-semibold">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</> : <><Save className="w-4 h-4 mr-2" />Guardar perfil</>}
              </Button>
            </div>

            {/* Plan Status Card */}
            {subscriptionStatus && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" /> Tu plan actual
                  </h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    subscriptionStatus.status === "active" ? "bg-amber-500/20 text-amber-400" :
                    subscriptionStatus.status === "trial" ? "bg-blue-500/20 text-blue-400" :
                    "bg-zinc-700 text-zinc-400"
                  }`}>
                    {subscriptionStatus.status === "trial" ? `Prueba — ${subscriptionStatus.trialDaysLeft}d restantes` :
                     subscriptionStatus.status === "active" ? subscriptionStatus.plan?.replace("_", " ").toUpperCase() :
                     "Expirado"}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Reservas este mes</span>
                    <span className="text-white font-medium">
                      {subscriptionStatus.usage.bookings}
                      {subscriptionStatus.limits.bookings ? `/${subscriptionStatus.limits.bookings}` : " (ilimitadas)"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Fotos en portfolio</span>
                    <span className="text-white font-medium">
                      {subscriptionStatus.usage.portfolio}
                      {subscriptionStatus.limits.portfolio ? `/${subscriptionStatus.limits.portfolio}` : " (ilimitadas)"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPlanModal(true)}
                  className="w-full flex items-center justify-between bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg px-4 py-3 transition-colors"
                >
                  <span className="text-sm font-semibold text-amber-400">Ver planes y actualizar</span>
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-[1000] glass border-t border-zinc-800/50 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              data-testid={`nav-${section.id}`}
              onClick={() => setActiveSection(section.id)}
              className={`flex flex-col items-center gap-1 py-2 px-3 transition-colors ${
                activeSection === section.id ? "text-amber-500" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <section.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{section.label}</span>
              {activeSection === section.id && (
                <div className="w-1 h-1 rounded-full bg-amber-500 -mt-0.5" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Plan Picker Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-end sm:items-center justify-center p-4" onClick={() => setShowPlanModal(false)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: "Syne" }}>Elige tu plan</h2>
              <button onClick={() => setShowPlanModal(false)}><X className="w-5 h-5 text-zinc-500" /></button>
            </div>

            <p className="text-xs text-zinc-500 uppercase font-bold mb-3 tracking-wider">Personal — Freelancers</p>
            <div className="space-y-3 mb-6">
              {[
                { key: "personal_basic", label: "Personal Basic", price: "€20/mes", bookings: "40 reservas/mes", portfolio: "15 fotos" },
                { key: "personal_pro", label: "Personal Pro", price: "€60/mes", bookings: "120 reservas/mes", portfolio: "Ilimitadas", highlight: true },
              ].map(plan => (
                <div key={plan.key} className={`border rounded-xl p-4 ${plan.highlight ? "border-amber-500/50 bg-amber-500/5" : "border-zinc-800 bg-zinc-900"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-bold text-white">{plan.label}</p>
                      <p className="text-xs text-zinc-500">{plan.bookings} · {plan.portfolio}</p>
                    </div>
                    <p className="text-amber-500 font-bold">{plan.price}</p>
                  </div>
                  <button disabled className="w-full mt-2 bg-zinc-700 text-zinc-400 rounded-full py-2 text-sm font-semibold cursor-not-allowed">
                    Próximamente
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs text-zinc-500 uppercase font-bold mb-3 tracking-wider">Business — Establecimientos</p>
            <div className="space-y-3">
              {[
                { key: "business_basic", label: "Business Basic", price: "€100/mes", bookings: "300 reservas/mes", portfolio: "Ilimitadas" },
                { key: "business_pro", label: "Business Pro", price: "€350/mes", bookings: "Ilimitadas", portfolio: "Ilimitadas", highlight: true },
              ].map(plan => (
                <div key={plan.key} className={`border rounded-xl p-4 ${plan.highlight ? "border-amber-500/50 bg-amber-500/5" : "border-zinc-800 bg-zinc-900"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-bold text-white">{plan.label}</p>
                      <p className="text-xs text-zinc-500">{plan.bookings} · {plan.portfolio}</p>
                    </div>
                    <p className="text-amber-500 font-bold">{plan.price}</p>
                  </div>
                  <button disabled className="w-full mt-2 bg-zinc-700 text-zinc-400 rounded-full py-2 text-sm font-semibold cursor-not-allowed">
                    Próximamente
                  </button>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* Boost Post Confirm Modal */}
      {boostingPostId && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4" onClick={() => setBoostingPostId(null)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-white">Destacar publicación</h3>
                <p className="text-xs text-zinc-500">7 días en el top del feed</p>
              </div>
            </div>
            <p className="text-zinc-400 text-sm mb-6">Tu publicación aparecerá en primer lugar en el feed de clientes durante 7 días con el badge ⚡ Destacado.</p>
            <div className="flex items-center justify-between mb-4 bg-zinc-900 rounded-xl px-4 py-3">
              <span className="text-zinc-300 text-sm">Precio</span>
              <span className="text-amber-500 font-bold text-lg">€10</span>
            </div>
            <button disabled className="w-full bg-zinc-700 text-zinc-400 rounded-full py-3 font-semibold cursor-not-allowed mb-2">
              Próximamente
            </button>
            <button onClick={() => setBoostingPostId(null)} className="w-full text-zinc-500 text-sm py-2">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

