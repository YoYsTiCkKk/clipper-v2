import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Scissors, Calendar, Clock, Plus, Trash2, LogOut,
  MapPin, Phone, User, Image as ImageIcon, Save, Loader2, Check, X,
  Upload, CalendarDays
} from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusMap = {
  pending: { label: "Pendiente", class: "bg-yellow-500/10 text-yellow-500 border-0" },
  confirmed: { label: "Confirmada", class: "bg-green-500/10 text-green-500 border-0" },
  completed: { label: "Completada", class: "bg-zinc-500/10 text-zinc-400 border-0" },
  cancelled: { label: "Cancelada", class: "bg-red-500/10 text-red-400 border-0" },
};

export default function BarberDashboard() {
  const navigate = useNavigate();
  const { user, logout, checkAuth, loading: authLoading } = useAuth();
  const [barberData, setBarberData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Service form
  const [newService, setNewService] = useState({ name: "", price: "", duration: "30" });
  // Portfolio form
  const [newImage, setNewImage] = useState({ url: "", description: "" });
  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: "", bio: "", address: "", phone: "", latitude: "", longitude: "",
  });
  const [saving, setSaving] = useState(false);
  // File upload
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  // Availability
  const [availDate, setAvailDate] = useState("");
  const [availConfig, setAvailConfig] = useState({ available: true, start_hour: "9", end_hour: "19" });
  const [customSchedule, setCustomSchedule] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const [barberRes, bookingsRes] = await Promise.all([
        axios.get(`${API}/auth/me`, { withCredentials: true }),
        axios.get(`${API}/bookings`, { withCredentials: true }),
      ]);
      setBarberData(barberRes.data);
      setBookings(bookingsRes.data);
      const bp = barberRes.data.barber_profile || {};
      const coords = bp.location?.coordinates || [0, 0];
      setProfileForm({
        name: barberRes.data.name || "",
        bio: bp.bio || "",
        address: bp.address || "",
        phone: barberRes.data.phone || "",
        latitude: coords[1] !== 0 ? String(coords[1]) : "",
        longitude: coords[0] !== 0 ? String(coords[0]) : "",
      });
      setCustomSchedule(bp.custom_schedule || {});
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (user.role !== "barber") { navigate("/bookings"); return; }
    fetchData();
  }, [user, navigate, fetchData, authLoading]);

  const handleAddService = async () => {
    if (!newService.name || !newService.price) return;
    try {
      await axios.post(`${API}/barbers/services`, {
        name: newService.name,
        price: parseFloat(newService.price),
        duration: parseInt(newService.duration) || 30,
      }, { withCredentials: true });
      setNewService({ name: "", price: "", duration: "30" });
      toast.success("Servicio agregado");
      fetchData();
    } catch (err) {
      toast.error("Error al agregar servicio");
    }
  };

  const handleDeleteService = async (serviceId) => {
    try {
      await axios.delete(`${API}/barbers/services/${serviceId}`, { withCredentials: true });
      toast.success("Servicio eliminado");
      fetchData();
    } catch { toast.error("Error al eliminar"); }
  };

  const handleAddImage = async () => {
    if (!newImage.url) return;
    try {
      await axios.post(`${API}/barbers/portfolio`, newImage, { withCredentials: true });
      setNewImage({ url: "", description: "" });
      toast.success("Imagen agregada");
      fetchData();
    } catch { toast.error("Error al agregar imagen"); }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      await axios.delete(`${API}/barbers/portfolio/${imageId}`, { withCredentials: true });
      toast.success("Imagen eliminada");
      fetchData();
    } catch { toast.error("Error al eliminar"); }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("description", uploadDesc);
      await axios.post(`${API}/barbers/portfolio/upload`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadFile(null);
      setUploadDesc("");
      toast.success("Imagen subida");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al subir imagen");
    } finally { setUploading(false); }
  };

  const handleSetAvailability = async () => {
    if (!availDate) { toast.error("Selecciona una fecha"); return; }
    try {
      await axios.put(`${API}/barbers/availability/custom`, {
        date: availDate,
        available: availConfig.available,
        start_hour: parseInt(availConfig.start_hour),
        end_hour: parseInt(availConfig.end_hour),
      }, { withCredentials: true });
      toast.success(`Disponibilidad para ${availDate} actualizada`);
      setCustomSchedule((prev) => ({
        ...prev,
        [availDate]: {
          available: availConfig.available,
          start_hour: parseInt(availConfig.start_hour),
          end_hour: parseInt(availConfig.end_hour),
        },
      }));
      setAvailDate("");
    } catch { toast.error("Error al actualizar disponibilidad"); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/barbers/profile`, {
        name: profileForm.name || undefined,
        bio: profileForm.bio || undefined,
        address: profileForm.address || undefined,
        phone: profileForm.phone || undefined,
        latitude: profileForm.latitude ? parseFloat(profileForm.latitude) : undefined,
        longitude: profileForm.longitude ? parseFloat(profileForm.longitude) : undefined,
      }, { withCredentials: true });
      toast.success("Perfil actualizado");
      await checkAuth();
      fetchData();
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  const handleBookingAction = async (bookingId, status) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}/status`, { status }, { withCredentials: true });
      toast.success(status === "confirmed" ? "Reserva confirmada" : status === "completed" ? "Reserva completada" : "Reserva cancelada");
      fetchData();
    } catch { toast.error("Error al actualizar"); }
  };

  const handleLogout = async () => { await logout(); navigate("/"); };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const profile = barberData?.barber_profile || {};
  const services = profile.services || [];
  const portfolio = profile.portfolio || [];
  const pendingBookings = bookings.filter((b) => b.status === "pending" || b.status === "confirmed");

  return (
    <div className="min-h-screen bg-zinc-950 pb-8">
      {/* Header */}
      <div className="glass border-b border-zinc-800 sticky top-0 z-30">
        <div className="container mx-auto px-4 max-w-4xl flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-amber-500" />
            <span className="text-lg font-bold text-white" style={{ fontFamily: "Syne" }}>
              Panel Barbero
            </span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button data-testid="barber-logout-btn" onClick={handleLogout}>
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
            <p className="text-xs text-zinc-500 mt-1">Reservas activas</p>
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
            <p className="text-xs text-zinc-500 mt-1">Fotos</p>
          </div>
        </div>

        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="w-full bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="bookings" data-testid="tab-bookings" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs sm:text-sm">Reservas</TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-services" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs sm:text-sm">Servicios</TabsTrigger>
            <TabsTrigger value="portfolio" data-testid="tab-portfolio" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs sm:text-sm">Portfolio</TabsTrigger>
            <TabsTrigger value="availability" data-testid="tab-availability" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs sm:text-sm">Horarios</TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs sm:text-sm">Perfil</TabsTrigger>
          </TabsList>

          {/* BOOKINGS TAB */}
          <TabsContent value="bookings" className="mt-4 space-y-3">
            {bookings.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No tienes reservas aun</p>
            ) : (
              bookings.map((b) => (
                <div key={b.booking_id} data-testid={`barber-booking-${b.booking_id}`} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
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
                      <Button data-testid={`confirm-${b.booking_id}`} onClick={() => handleBookingAction(b.booking_id, "confirmed")} className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white rounded-full text-sm"><Check className="w-3 h-3 mr-1" />Confirmar</Button>
                      <Button data-testid={`cancel-${b.booking_id}`} onClick={() => handleBookingAction(b.booking_id, "cancelled")} variant="outline" className="flex-1 h-8 border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-full text-sm"><X className="w-3 h-3 mr-1" />Rechazar</Button>
                    </div>
                  )}
                  {b.status === "confirmed" && (
                    <Button data-testid={`complete-${b.booking_id}`} onClick={() => handleBookingAction(b.booking_id, "completed")} className="w-full h-8 bg-amber-500 hover:bg-amber-600 text-black rounded-full text-sm">Marcar como completada</Button>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* SERVICES TAB */}
          <TabsContent value="services" className="mt-4 space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Agregar servicio</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input data-testid="new-service-name" placeholder="Nombre del servicio" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
                <Input data-testid="new-service-price" type="number" placeholder="Precio (€)" value={newService.price} onChange={(e) => setNewService({ ...newService, price: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
                <Input data-testid="new-service-duration" type="number" placeholder="Duracion (min)" value={newService.duration} onChange={(e) => setNewService({ ...newService, duration: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
              </div>
              <Button data-testid="add-service-btn" onClick={handleAddService} className="mt-3 rounded-full bg-amber-500 text-black hover:bg-amber-600 h-9 text-sm"><Plus className="w-4 h-4 mr-1" />Agregar</Button>
            </div>
            <div className="space-y-2">
              {services.map((s) => (
                <div key={s.service_id} data-testid={`manage-service-${s.service_id}`} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{s.name}</p>
                    <p className="text-sm text-zinc-500">{s.duration} min · {s.price.toFixed(0)}€</p>
                  </div>
                  <button data-testid={`delete-service-${s.service_id}`} onClick={() => handleDeleteService(s.service_id)} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* PORTFOLIO TAB */}
          <TabsContent value="portfolio" className="mt-4 space-y-4">
            {/* File Upload */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-500" />Subir imagen
              </h3>
              <div className="space-y-3">
                <input
                  data-testid="portfolio-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-amber-500/10 file:text-amber-500 file:text-xs file:font-medium hover:file:bg-amber-500/20"
                />
                <Input data-testid="upload-desc-input" placeholder="Descripcion (opcional)" value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
                <Button data-testid="upload-image-btn" onClick={handleFileUpload} disabled={!uploadFile || uploading} className="rounded-full bg-amber-500 text-black hover:bg-amber-600 h-9 text-sm">
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Subiendo...</> : <><Upload className="w-4 h-4 mr-1" />Subir</>}
                </Button>
              </div>
            </div>
            {/* URL-based add */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">O agregar por URL</h3>
              <div className="space-y-3">
                <Input data-testid="new-image-url" placeholder="URL de la imagen" value={newImage.url} onChange={(e) => setNewImage({ ...newImage, url: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
                <Input data-testid="new-image-desc" placeholder="Descripcion (opcional)" value={newImage.description} onChange={(e) => setNewImage({ ...newImage, description: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
              </div>
              <Button data-testid="add-image-btn" onClick={handleAddImage} className="mt-3 rounded-full bg-amber-500 text-black hover:bg-amber-600 h-9 text-sm"><Plus className="w-4 h-4 mr-1" />Agregar</Button>
            </div>
            {portfolio.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {portfolio.map((img) => (
                  <div key={img.image_id} className="relative group rounded-xl overflow-hidden aspect-square">
                    <img src={img.url.startsWith("/api") ? `${process.env.REACT_APP_BACKEND_URL}${img.url}` : img.url} alt={img.description} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                      <button data-testid={`delete-image-${img.image_id}`} onClick={() => handleDeleteImage(img.image_id)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full p-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* AVAILABILITY TAB */}
          <TabsContent value="availability" className="mt-4 space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-amber-500" />Configurar disponibilidad por dia
              </h3>
              <p className="text-xs text-zinc-500">Establece horarios personalizados o marca dias como no disponible.</p>
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Fecha</Label>
                <Input data-testid="avail-date-input" type="date" value={availDate} onChange={(e) => setAvailDate(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={availConfig.available} onChange={(e) => setAvailConfig({...availConfig, available: e.target.checked})} className="accent-amber-500" />
                  <span className="text-sm text-zinc-300">Disponible</span>
                </label>
              </div>
              {availConfig.available && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-zinc-400 text-xs mb-1 block">Hora inicio</Label>
                    <select data-testid="avail-start-hour" value={availConfig.start_hour} onChange={(e) => setAvailConfig({...availConfig, start_hour: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm py-2 px-2">
                      {Array.from({length: 14}, (_, i) => i + 7).map(h => <option key={h} value={h}>{h}:00</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs mb-1 block">Hora fin</Label>
                    <select data-testid="avail-end-hour" value={availConfig.end_hour} onChange={(e) => setAvailConfig({...availConfig, end_hour: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm py-2 px-2">
                      {Array.from({length: 14}, (_, i) => i + 8).map(h => <option key={h} value={h}>{h}:00</option>)}
                    </select>
                  </div>
                </div>
              )}
              <Button data-testid="save-availability-btn" onClick={handleSetAvailability} className="w-full rounded-full bg-amber-500 text-black hover:bg-amber-600 h-10 font-semibold">
                <Save className="w-4 h-4 mr-2" />Guardar disponibilidad
              </Button>
            </div>
            {/* Custom schedule overview */}
            {Object.keys(customSchedule).length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Horarios personalizados</h3>
                <div className="space-y-2">
                  {Object.entries(customSchedule).sort().map(([date, cfg]) => (
                    <div key={date} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <span className="text-sm text-white">{date}</span>
                      {cfg.available ? (
                        <Badge className="bg-green-500/10 text-green-500 border-0 text-xs">{cfg.start_hour}:00 - {cfg.end_hour}:00</Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-400 border-0 text-xs">No disponible</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* PROFILE TAB */}
          <TabsContent value="profile" className="mt-4 space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Nombre</Label>
                <Input data-testid="profile-name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Bio</Label>
                <textarea data-testid="profile-bio" value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} rows={3} className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none resize-none" />
              </div>
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Direccion</Label>
                <Input data-testid="profile-address" value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} placeholder="Calle, ciudad" className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
              </div>
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Telefono</Label>
                <Input data-testid="profile-phone" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+34 600 000 000" className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
              </div>
              <Separator className="bg-zinc-800" />
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">Ubicacion (coordenadas)</Label>
                <p className="text-xs text-zinc-500 mb-2">Introduce latitud y longitud para aparecer en el mapa</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input data-testid="profile-latitude" type="number" step="any" placeholder="Latitud (ej: 40.4168)" value={profileForm.latitude} onChange={(e) => setProfileForm({ ...profileForm, latitude: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
                  <Input data-testid="profile-longitude" type="number" step="any" placeholder="Longitud (ej: -3.7038)" value={profileForm.longitude} onChange={(e) => setProfileForm({ ...profileForm, longitude: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600" />
                </div>
              </div>
              <Button data-testid="save-profile-btn" onClick={handleSaveProfile} disabled={saving} className="w-full rounded-full bg-amber-500 text-black hover:bg-amber-600 h-10 font-semibold">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</> : <><Save className="w-4 h-4 mr-2" />Guardar perfil</>}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
