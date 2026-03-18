import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Clock, CreditCard, Banknote, Star,
  Check, Scissors, Loader2
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TRANSPORT_FEE = 5.00;
const MANAGEMENT_FEE = 2.50;

export default function BookingPage() {
  const { barberId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [barber, setBarber] = useState(null);
  const [selectedService, setSelectedService] = useState(location.state?.serviceId || null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("app"); // 'app' or 'cash'
  const [locationType, setLocationType] = useState("barbershop"); // 'barbershop' or 'home'
  const [verifying, setVerifying] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      try {
        const res = await axios.get(`${API}/barbers/${barberId}`);
        setBarber(res.data);
        if (!selectedService && res.data.barber_profile?.services?.length > 0) {
          setSelectedService(res.data.barber_profile.services[0].service_id);
        }
      } catch { navigate("/explore"); }
      finally { setPageLoading(false); }
    })();
  }, [barberId, navigate, user, selectedService, authLoading]);

  useEffect(() => {
    if (!selectedDate || !barberId) return;
    const dateStr = selectedDate.toISOString().split("T")[0];
    setSlotsLoading(true);
    axios.get(`${API}/barbers/${barberId}/slots`, { params: { date: dateStr } })
      .then((res) => setAvailableSlots(res.data.slots || []))
      .catch(() => setAvailableSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, barberId]);

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!barber) return null;

  const profile = barber.barber_profile || {};
  const services = profile.services || [];
  const currentService = services.find((s) => s.service_id === selectedService);
  const servicePrice = currentService?.price || 0;
  
  const offersHomeService = profile.offers_home_service || false;
  const transportFee = locationType === "home" ? parseFloat(profile.home_service_fee || 2.5) : 0;
  
  const subtotal = servicePrice + transportFee + MANAGEMENT_FEE;
  const userCredits = user?.credits || 0;
  const discount = Math.min(userCredits, subtotal);
  const total = subtotal - discount;

  const handleConfirm = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error("Completa todos los campos");
      return;
    }
    setSubmitting(true);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const res = await axios.post(`${API}/bookings`, {
        barber_id: barberId,
        service_id: selectedService,
        date: selectedDate,
        time: selectedTime,
        payment_method: paymentMethod,
        location_type: locationType
      }, { withCredentials: true });

      const checkout = await axios.post(`${API}/payments/checkout`, {
        booking_id: res.data.booking_id,
        origin_url: window.location.origin,
      }, { withCredentials: true });
      window.location.href = checkout.data.url;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al crear la reserva");
    } finally {
      setSubmitting(false);
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="sticky top-0 z-30 glass border-b border-zinc-800">
        <div className="container mx-auto px-4 max-w-3xl flex items-center h-14">
          <button data-testid="booking-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5 text-zinc-400 hover:text-white transition-colors" />
          </button>
          <h1 className="ml-4 text-lg font-bold text-white" style={{ fontFamily: "Syne" }}>
            Reservar cita
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl py-6 space-y-8">
        {/* Barber Info */}
        <div className="flex items-center gap-4">
          <img
            src={barber.picture || "https://via.placeholder.com/56"}
            alt={barber.name}
            className="w-14 h-14 rounded-xl object-cover border border-zinc-700"
          />
          <div>
            <p className="text-white font-bold">{barber.name}</p>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{profile.rating}</span>
              <span className="text-zinc-600">·</span>
              <span>{profile.address?.split(",")[0]}</span>
            </div>
          </div>
        </div>

        {/* Service Selection */}
        <div>
          <h2 className="text-base md:text-lg font-bold text-white mb-3" style={{ fontFamily: "Syne" }}>
            Selecciona un servicio
          </h2>
          <div className="space-y-2">
            {services.map((s) => (
              <button
                key={s.service_id}
                data-testid={`booking-service-${s.service_id}`}
                onClick={() => setSelectedService(s.service_id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedService === s.service_id
                    ? "border-amber-500 bg-amber-500/5"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedService === s.service_id
                        ? "border-amber-500 bg-amber-500"
                        : "border-zinc-600"
                    }`}>
                      {selectedService === s.service_id && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <div>
                      <p className="text-white font-medium">{s.name}</p>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {s.duration} min
                      </p>
                    </div>
                  </div>
                  <span className="text-amber-500 font-bold" style={{ fontFamily: "Syne" }}>
                    {s.price.toFixed(0)}€
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Date Selection */}
        <div>
          <h2 className="text-base md:text-lg font-bold text-white mb-3" style={{ fontFamily: "Syne" }}>
            Elige fecha
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => { setSelectedDate(d); setSelectedTime(null); }}
              disabled={(date) => date < tomorrow || date > maxDate}
              className="text-white"
            />
          </div>
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div>
            <h2 className="text-base md:text-lg font-bold text-white mb-3" style={{ fontFamily: "Syne" }}>
              Elige hora
            </h2>
            {slotsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4">No hay horarios disponibles para esta fecha.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    data-testid={`time-slot-${slot}`}
                    onClick={() => setSelectedTime(slot)}
                    className={`time-slot py-2.5 rounded-full border text-sm font-medium transition-all ${
                      selectedTime === slot
                        ? "selected"
                        : "border-zinc-700 text-zinc-400 bg-zinc-900"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payment Method */}
        <div>
          <h2 className="text-base md:text-lg font-bold text-white mb-3" style={{ fontFamily: "Syne" }}>
            Metodo de pago
          </h2>
          <div className="flex gap-3">
            <button
              data-testid="payment-method-app"
              onClick={() => setPaymentMethod("app")}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full border font-medium transition-all ${
                paymentMethod === "app"
                  ? "bg-amber-500 text-black border-amber-500"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Pagar con app
            </button>
            <button
              data-testid="payment-method-cash"
              onClick={() => setPaymentMethod("cash")}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full border font-medium transition-all ${
                paymentMethod === "cash"
                  ? "bg-amber-500 text-black border-amber-500"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              <Banknote className="w-4 h-4" />
              Efectivo
            </button>
          </div>
          {paymentMethod === "cash" && (
            <p className="text-xs text-zinc-500 mt-2">
              Pagarás el servicio en efectivo al barbero. Se te pedirá una tarjeta como garantía (Solo para penalización del 30% en caso de cancelaciones sorpresa o no-show).
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-0 text-xs">
              Visa / Mastercard
            </Badge>
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-500 border-0 text-xs opacity-50">
              Bizum (proximamente)
            </Badge>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Resumen</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">{currentService?.name || "Servicio"}</span>
              <span className="text-white">{servicePrice.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Transporte</span>
              <span className="text-white">{transportFee.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Gestion</span>
              <span className="text-white">{MANAGEMENT_FEE.toFixed(2)}€</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-500">
                <span>Crédito aplicado</span>
                <span>-{discount.toFixed(2)}€</span>
              </div>
            )}
            <div className="h-px bg-zinc-800 my-2" />
            <div className="flex justify-between">
              <span className="text-white font-bold">Total</span>
              <span className="text-amber-500 font-bold text-lg" style={{ fontFamily: "Syne" }}>
                {total.toFixed(2)}€
              </span>
            </div>
            {paymentMethod === "cash" && (
              <p className="text-xs text-zinc-500 mt-1">
                Cobro en app: {Math.max(0, transportFee + MANAGEMENT_FEE - discount).toFixed(2)}€ · En efectivo: {servicePrice.toFixed(2)}€
              </p>
            )}
          </div>
        </div>

        {/* Confirm Button */}
        <Button
          data-testid="confirm-booking-btn"
          onClick={handleConfirm}
          disabled={!selectedService || !selectedDate || !selectedTime || submitting}
          className="w-full rounded-full bg-amber-500 text-black hover:bg-amber-600 h-12 text-base font-semibold disabled:opacity-50"
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin mr-2" />Procesando...</>
          ) : (
            <><Scissors className="w-5 h-5 mr-2" />Confirmar reserva</>
          )}
        </Button>

        <div className="h-8" />
      </div>
    </div>
  );
}
