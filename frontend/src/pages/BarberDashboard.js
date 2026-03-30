import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Scissors, Calendar, Clock, Plus, Trash2, LogOut,
  MapPin, Phone, User, Image as ImageIcon, Save, Loader2, Check, X,
  Upload, CalendarDays, Star, MessageSquare
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

export default function BarberDashboard() {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAuth();
  
  // Convex Reactivity Queries
  const barberData = useQuery(api.users.getMe);
  const bookings = useQuery(api.bookings.getMyBookings) || [];
  const reviews = useQuery(api.reviews.getBarberReviews, barberData ? { barber_id: barberData.user_id } : "skip") || [];
  const services = useQuery(api.services.getBarberServices, barberData ? { barber_id: barberData.user_id } : "skip") || [];
  const portfolio = useQuery(api.portfolio.getBarberPortfolio, barberData ? { barber_id: barberData.user_id } : "skip") || [];

  // Mutations
  const updateProfile = useMutation(api.users.updateBarberProfile);
  const updateAvailability = useMutation(api.users.updateAvailability);
  const removeAvailability = useMutation(api.users.removeAvailability);
  const addServiceObj = useMutation(api.services.addService);
  const removeServiceObj = useMutation(api.services.removeService);
  const updateBookingStatus = useMutation(api.bookings.updateStatus);
  const generateUploadUrl = useMutation(api.portfolio.generateUploadUrl);
  const addPortfolioPost = useMutation(api.portfolio.addPortfolioPost);
  const deletePortfolioPost = useMutation(api.portfolio.deletePortfolioImage);

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
    name: "", bio: "", address: "", phone: "", lat: "", lng: "", offersHomeService: false, homeServiceFee: ""
  });
  const [saving, setSaving] = useState(false);
  
  // Availability Form
  const [availDate, setAvailDate] = useState("");
  const [availConfig, setAvailConfig] = useState({ available: true, start_hour: "9", end_hour: "19" });
  const [customSchedule, setCustomSchedule] = useState({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (user.role !== "barber") { navigate("/bookings"); return; }
  }, [user, navigate, authLoading]);

  // Sync profile data when Convex query loads
  useEffect(() => {
    if (barberData && barberData.barber_profile) {
      const bp = barberData.barber_profile;
      const coords = bp.location?.coordinates || [0, 0];
      setProfileForm({
        name: barberData.name || "",
        bio: bp.bio || "",
        address: bp.address || "",
        phone: barberData.phone || "",
        lat: coords[1] !== 0 ? String(coords[1]) : "",
        lng: coords[0] !== 0 ? String(coords[0]) : "",
        offersHomeService: bp.offers_home_service || false,
        homeServiceFee: bp.home_service_fee !== undefined ? String(bp.home_service_fee) : ""
      });
      setCustomSchedule(bp.custom_schedule || {});
    }
  }, [barberData]);

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

  const handleSetAvailability = async () => {
    if (!availDate) { toast.error("Selecciona una fecha"); return; }
    try {
      await updateAvailability({
        date: availDate,
        available: availConfig.available,
        start_hour: parseInt(availConfig.start_hour),
        end_hour: parseInt(availConfig.end_hour),
      });
      toast.success(`Disponibilidad para ${availDate} guardada`);
      setAvailDate("");
    } catch { toast.error("Error al actualizar disponibilidad"); }
  };

  const handleDeleteAvailability = async (dateStr) => {
    try {
      await removeAvailability({ date: dateStr });
      toast.success(`Disponibilidad de ${dateStr} restaurada`);
    } catch { toast.error("Error al eliminar regla"); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: profileForm.name || undefined,
        phone: profileForm.phone || undefined,
        bio: profileForm.bio || undefined,
        address: profileForm.address || undefined,
        offers_home_service: profileForm.offersHomeService,
        home_service_fee: profileForm.offersHomeService ? (parseFloat(profileForm.homeServiceFee) || 0) : undefined,
        lat: profileForm.lat ? parseFloat(profileForm.lat) : undefined,
        lng: profileForm.lng ? parseFloat(profileForm.lng) : undefined
      });
      toast.success("Perfil actualizado en Convex");
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
    <div className="min-h-screen bg-zinc-950 pb-8">
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-500" style={{ fontFamily: "Syne" }}>
              {pendingBookings.length}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Reservas</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white" style={{ fontFamily: "Syne" }}>
              {services.length}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Servicios</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white" style={{ fontFamily: "Syne" }}>
              {portfolio.length}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Posts</p>
          </div>
        </div>

        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="w-full bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="bookings" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs sm:text-sm">Reservas</TabsTrigger>
            <TabsTrigger value="services" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs sm:text-sm">Servicios</TabsTrigger>
            <TabsTrigger value="portfolio" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs sm:text-sm">Publicaciones</TabsTrigger>
            <TabsTrigger value="availability" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs sm:text-sm">Horarios</TabsTrigger>
            <TabsTrigger value="profile" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs sm:text-sm">Perfil</TabsTrigger>
          </TabsList>

          {/* BOOKINGS */}
          <TabsContent value="bookings" className="mt-4 space-y-3">
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
          </TabsContent>

          {/* SERVICES */}
          <TabsContent value="services" className="mt-4 space-y-4">
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
          </TabsContent>

          {/* PORTFOLIO / PUBLICACIONES */}
          <TabsContent value="portfolio" className="mt-4 space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-500" />Nueva Publicación (Soporta múltiples)
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
                <p className="text-xs text-zinc-500">O pegar una URL externa (si no quieres usar archivos)</p>
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
                  // Retrocompatibilidad con posts viejos (single url)
                  const firstMedia = mediaCount > 0 ? post.media[0] : { url: post.url, type: "image" };
                  const isVideo = firstMedia.type === "video";
                  
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
                      
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center z-20">
                        <button onClick={() => handleDeletePost(post._id)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full p-2 hover:bg-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* AVAILABILITY */}
          <TabsContent value="availability" className="mt-4 space-y-4">
             <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-amber-500" />Configurar disponibilidad por dia
              </h3>
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Fecha</Label>
                <Input type="date" value={availDate} onChange={(e) => setAvailDate(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={availConfig.available} onChange={(e) => setAvailConfig({...availConfig, available: e.target.checked})} className="accent-amber-500" />
                  <span className="text-sm text-zinc-300">Disponible ese día</span>
                </label>
              </div>
              {availConfig.available && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-zinc-400 text-xs mb-1 block">Hora inicio</Label>
                    <select value={availConfig.start_hour} onChange={(e) => setAvailConfig({...availConfig, start_hour: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm py-2 px-2">
                      {Array.from({length: 14}, (_, i) => i + 7).map(h => <option key={h} value={h}>{h}:00</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs mb-1 block">Hora fin</Label>
                    <select value={availConfig.end_hour} onChange={(e) => setAvailConfig({...availConfig, end_hour: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm py-2 px-2">
                      {Array.from({length: 14}, (_, i) => i + 8).map(h => <option key={h} value={h}>{h}:00</option>)}
                    </select>
                  </div>
                </div>
              )}
              <Button onClick={handleSetAvailability} className="w-full rounded-full bg-amber-500 text-black hover:bg-amber-600 h-10 font-semibold">
                <Save className="w-4 h-4 mr-2" />Guardar horario
              </Button>
            </div>

            {Object.keys(customSchedule).length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Días Modificados</h3>
                <div className="space-y-2">
                  {Object.entries(customSchedule).sort().map(([date, cfg]) => (
                    <div key={date} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <span className="text-sm text-white">{date}</span>
                      <div className="flex items-center gap-3">
                        {cfg.available ? (
                          <Badge className="bg-green-500/10 text-green-500 border-0 text-xs">{cfg.start_hour}:00 - {cfg.end_hour}:00</Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-400 border-0 text-xs">No laborable</Badge>
                        )}
                        <button onClick={() => handleDeleteAvailability(date)} className="text-zinc-600 hover:text-red-400 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* PROFILE */}
          <TabsContent value="profile" className="mt-4 space-y-4">
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
                <p className="text-xs text-amber-500 mb-2 font-medium">Ubicación para clientes cercanos</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" step="any" placeholder="Latitud (40.416)" value={profileForm.lat} onChange={(e) => setProfileForm({ ...profileForm, lat: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
                  <Input type="number" step="any" placeholder="Longitud (-3.703)" value={profileForm.lng} onChange={(e) => setProfileForm({ ...profileForm, lng: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
                </div>
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
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</> : <><Save className="w-4 h-4 mr-2" />Guardar perfil Convex</>}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
