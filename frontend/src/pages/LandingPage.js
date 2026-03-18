import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Scissors, MapPin, Calendar, CreditCard, ChevronRight } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-zinc-800/50">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl flex items-center justify-between h-16">
          <button
            data-testid="nav-logo"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <Scissors className="w-6 h-6 text-amber-500" />
            <span className="text-xl font-bold text-white" style={{ fontFamily: 'Syne' }}>
              Clipper
            </span>
          </button>
          <div className="flex items-center gap-3">
            {user ? (
              <Button
                data-testid="nav-dashboard-btn"
                onClick={() => navigate(user.role === "barber" ? "/dashboard" : "/explore")}
                className="rounded-full bg-amber-500 text-black hover:bg-amber-600"
              >
                {user.role === "barber" ? "Mi Panel" : "Explorar"}
              </Button>
            ) : (
              <>
                <Button
                  data-testid="nav-login-btn"
                  variant="ghost"
                  onClick={() => navigate("/auth")}
                  className="text-zinc-300 hover:text-white hover:bg-zinc-800"
                >
                  Iniciar sesion
                </Button>
                <Button
                  data-testid="nav-register-btn"
                  onClick={() => navigate("/auth?tab=register")}
                  className="rounded-full bg-amber-500 text-black hover:bg-amber-600"
                >
                  Registrarse
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 hero-bg opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/60 via-zinc-950/80 to-zinc-950" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 30% 50%, rgba(245,158,11,0.2) 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10 container mx-auto px-4 md:px-6 max-w-7xl pt-20">
          <div className="max-w-2xl">
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 animate-fade-in-up"
              style={{ fontFamily: 'Syne' }}
            >
              Tu barbero,<br />
              <span className="text-amber-500">donde tu quieras</span>
            </h1>
            <p className="text-base md:text-lg text-zinc-400 leading-relaxed mb-10 max-w-lg animate-fade-in-up stagger-1">
              Encuentra los mejores barberos cerca de ti. Reserva cita, elige tu servicio
              y paga como prefieras. Asi de facil.
            </p>
            <div className="flex flex-wrap gap-4 animate-fade-in-up stagger-2">
              <Button
                data-testid="hero-explore-btn"
                onClick={() => navigate("/explore")}
                className="rounded-full bg-amber-500 text-black hover:bg-amber-600 h-12 px-8 text-base font-semibold"
              >
                Buscar barberos
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
              <Button
                data-testid="hero-barber-btn"
                variant="outline"
                onClick={() => navigate("/auth?tab=register&role=barber")}
                className="rounded-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white h-12 px-8 text-base"
              >
                Soy barbero
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 md:py-24 bg-zinc-950">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl">
          <h2
            className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-16 text-left"
            style={{ fontFamily: 'Syne' }}
          >
            Como funciona
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              {
                icon: MapPin,
                title: "Busca",
                desc: "Encuentra barberos disponibles cerca de tu ubicacion en el mapa interactivo.",
              },
              {
                icon: Calendar,
                title: "Reserva",
                desc: "Elige el servicio que necesitas, selecciona dia y hora, y confirma tu cita.",
              },
              {
                icon: CreditCard,
                title: "Paga",
                desc: "Paga con tarjeta a traves de la app o en efectivo al barbero. Tu eliges.",
              },
            ].map((step, i) => (
              <div
                key={step.title}
                className={`animate-fade-in-up stagger-${i + 1}`}
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                  <step.icon className="w-7 h-7 text-amber-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Syne' }}>
                  {step.title}
                </h3>
                <p className="text-zinc-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-zinc-900/50">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl text-center">
          <h2
            className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-6"
            style={{ fontFamily: 'Syne' }}
          >
            Listo para encontrar<br />tu barbero ideal?
          </h2>
          <p className="text-zinc-400 mb-10 max-w-md mx-auto">
            Unete a miles de personas que ya confian en Clipper para sus cortes.
          </p>
          <Button
            data-testid="cta-explore-btn"
            onClick={() => navigate("/explore")}
            className="rounded-full bg-amber-500 text-black hover:bg-amber-600 h-12 px-10 text-base font-semibold"
          >
            Explorar barberos
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-zinc-800">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-bold text-white" style={{ fontFamily: 'Syne' }}>Clipper</span>
          </div>
          <p className="text-xs text-zinc-500">2025 Clipper. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
