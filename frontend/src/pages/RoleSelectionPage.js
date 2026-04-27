import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Scissors, User, Loader2, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  const dbUser = useQuery(api.users.getMe);
  const storeUser = useMutation(api.users.storeUser);
  const setTrialOnRegistration = useMutation(api.users.setTrialOnRegistration);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  // Handle redirects in useEffect to avoid render-loop flickering
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { navigate("/auth", { replace: true }); return; }
    if (dbUser) {
      navigate(dbUser.role === "barber" ? "/dashboard" : "/feed", { replace: true });
    }
  }, [isLoaded, isSignedIn, dbUser, navigate]);

  // Show spinner while loading
  if (!isLoaded || !isSignedIn || dbUser === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (dbUser) return null;

  const handleConfirm = async () => {
    if (!selected || !clerkUser) return;
    setCreating(true);
    try {
      await storeUser({
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        name: clerkUser.fullName || clerkUser.firstName || "Usuario",
        role: selected,
        picture: clerkUser.imageUrl
      });
      // Start 30-day trial immediately for new barbers
      if (selected === "barber") {
        try { await setTrialOnRegistration(); } catch {}
      }
      toast.success(selected === "barber" ? "¡Bienvenido, barbero! Tienes 30 días gratis." : "¡Cuenta creada!");
    } catch (err) {
      console.error(err);
      toast.error("Error al crear la cuenta");
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="flex items-center gap-2 mb-4">
          <Logo className="w-7 h-7 text-amber-500" />
          <span className="text-2xl font-bold text-white" style={{ fontFamily: "Syne" }}>Trimmer</span>
        </div>
        
        <h1 className="text-xl font-bold text-white mb-2 text-center" style={{ fontFamily: "Syne" }}>
          ¿Cómo quieres usar Trimmer?
        </h1>
        <p className="text-sm text-zinc-500 mb-8 text-center">
          Elige tu tipo de cuenta. Podrás cambiarlo más adelante.
        </p>

        <div className="w-full space-y-3">
          {/* Client option */}
          <button
            onClick={() => setSelected("client")}
            className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
              selected === "client"
                ? "border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/10"
                : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                selected === "client" ? "bg-amber-500/20" : "bg-zinc-800"
              }`}>
                <User className={`w-6 h-6 ${selected === "client" ? "text-amber-500" : "text-zinc-400"}`} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-base mb-1">Busco un barbero</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Explora barberos cerca de ti, reserva citas y descubre nuevos estilos.
                </p>
              </div>
              {selected === "client" && (
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>

          {/* Barber option */}
          <button
            onClick={() => setSelected("barber")}
            className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
              selected === "barber"
                ? "border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/10"
                : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                selected === "barber" ? "bg-amber-500/20" : "bg-zinc-800"
              }`}>
                <Scissors className={`w-6 h-6 ${selected === "barber" ? "text-amber-500" : "text-zinc-400"}`} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-base mb-1">Soy barbero</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Gestiona tu agenda, publica tu portfolio y recibe reservas de clientes.
                </p>
              </div>
              {selected === "barber" && (
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selected || creating}
          className={`w-full mt-6 h-12 rounded-full font-semibold text-base flex items-center justify-center gap-2 transition-all duration-200 ${
            selected 
              ? "bg-amber-500 text-black hover:bg-amber-600 shadow-lg shadow-amber-500/20" 
              : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
          }`}
        >
          {creating ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Creando cuenta...</>
          ) : (
            <>Continuar <ArrowRight className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  );
}
