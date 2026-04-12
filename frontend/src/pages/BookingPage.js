import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Loader2, Scissors } from "lucide-react";
import { toast } from "sonner";

const MANAGEMENT_FEE = 2.50;

export default function BookingPage() {
  const { barberId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  
  const barber = useQuery(api.users.getBarber, { barber_id: barberId });
  const schedule = useQuery(api.users.getBarberSchedule, { barber_id: barberId });
  const createBooking = useMutation(api.bookings.createBooking);

  const [selectedService, setSelectedService] = useState(location.state?.serviceId || "svc_01");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("app");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
  }, [user, authLoading, navigate]);

  if (authLoading || barber === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (barber === null) return <div className="text-white p-8">Barbero no encontrado.</div>;

  const profile = barber.barber_profile || {};
  const servicePrice = 15;
  const transportFee = 0;
  const subtotal = servicePrice + transportFee + MANAGEMENT_FEE;
  const total = subtotal;

  // Generar slots dinámicos basados en el horario del barbero
  const getAvailableSlots = () => {
    if (!selectedDate || !schedule) return [];
    
    const dateStr = selectedDate.toISOString().split("T")[0];
    // JS getDay(): 0=Sunday, 1=Monday... queremos 1=Lunes, 7=Domingo
    const jsDay = selectedDate.getDay();
    const dayNum = jsDay === 0 ? 7 : jsDay;
    
    // Comprobar si hay excepción para esta fecha
    const override = schedule.custom_schedule?.[dateStr];
    if (override) {
      if (!override.available) return []; // Cerrado por excepción
      return generateSlots(override.start_hour, override.end_hour);
    }
    
    // Usar horario semanal
    const weekDay = schedule.weekly_schedule?.[String(dayNum)];
    if (!weekDay || !weekDay.available) return [];
    return generateSlots(weekDay.start_hour, weekDay.end_hour);
  };

  const generateSlots = (startHour, endHour) => {
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      if (h + 0.5 < endHour) {
        slots.push(`${String(h).padStart(2, '0')}:30`);
      }
    }
    return slots;
  };

  const availableSlots = getAvailableSlots();

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Completa todos los campos");
      return;
    }
    setSubmitting(true);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      await createBooking({
        barber_id: barberId,
        service_id: selectedService,
        date: dateStr,
        time: selectedTime,
        payment_method: paymentMethod,
      });

      toast.success("Reserva enviada instantáneamente vía Convex ✨");
      navigate("/bookings"); 
    } catch (err) {
      toast.error("Error al crear la reserva");
    } finally {
      setSubmitting(false);
    }
  };

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 30);

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="sticky top-0 z-30 glass border-b border-zinc-800">
        <div className="container mx-auto px-4 max-w-3xl flex items-center h-14">
          <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-zinc-400" /></button>
          <h1 className="ml-4 text-lg font-bold text-white">Reservar cita</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl py-6 space-y-8">
        <div className="flex items-center gap-4">
          <img src={barber.picture || "https://picsum.photos/100"} alt="Barber" className="w-14 h-14 rounded-xl object-cover border border-zinc-700" />
          <div>
            <p className="text-white font-bold">{barber.name}</p>
            <p className="text-amber-500 text-sm">{(profile.address || "Madrid, España").split(",")[0]}</p>
          </div>
        </div>

        {/* Date Selection */}
        <div>
          <h2 className="text-white font-bold mb-3" style={{ fontFamily: "Syne" }}>Fecha</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex justify-center py-2">
            <Calendar mode="single" selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setSelectedTime(null); }} className="text-white bg-transparent" />
          </div>
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div>
            <h2 className="text-white font-bold mb-3" style={{ fontFamily: "Syne" }}>Hora</h2>
            {availableSlots.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                <p className="text-zinc-400 text-sm">Este barbero no trabaja el día seleccionado.</p>
                <p className="text-zinc-600 text-xs mt-1">Prueba con otro día.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableSlots.map(s => (
                  <button key={s} onClick={() => setSelectedTime(s)} className={`py-3 rounded-xl border font-bold transition-colors ${selectedTime === s ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20" : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-500"}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Total Cost */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex justify-between items-center text-white font-bold">
            <span>Total a pagar</span>
            <span className="text-amber-500 text-2xl" style={{ fontFamily: "Syne" }}>{total.toFixed(2)}€</span>
        </div>

        <Button onClick={handleConfirm} disabled={!selectedDate || !selectedTime || submitting} className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-2xl text-lg">
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Scissors className="w-5 h-5 mr-2"/> Cita en Convex</>}
        </Button>
      </div>
    </div>
  );
}
