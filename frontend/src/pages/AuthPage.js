import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scissors, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, login } = useAuth();
  const [tab, setTab] = useState(searchParams.get("tab") || "login");
  const [role, setRole] = useState(searchParams.get("role") || "client");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (user) navigate(user.role === "barber" ? "/dashboard" : "/explore", { replace: true });
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, {
        email: form.email, password: form.password,
      }, { withCredentials: true });
      login(res.data);
      toast.success("Bienvenido de vuelta");
      navigate(res.data.role === "barber" ? "/dashboard" : "/explore");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, {
        name: form.name, email: form.email, password: form.password, role,
      }, { withCredentials: true });
      login(res.data);
      toast.success("Cuenta creada correctamente");
      navigate(res.data.role === "barber" ? "/dashboard" : "/explore");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/bookings";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <button
        data-testid="auth-back-btn"
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Volver</span>
      </button>

      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <Scissors className="w-7 h-7 text-amber-500" />
          <span className="text-2xl font-bold text-white" style={{ fontFamily: "Syne" }}>Clipper</span>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full bg-zinc-900 border border-zinc-800">
            <TabsTrigger
              data-testid="auth-tab-login"
              value="login"
              className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
            >
              Iniciar sesion
            </TabsTrigger>
            <TabsTrigger
              data-testid="auth-tab-register"
              value="register"
              className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
            >
              Registrarse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="mt-6 space-y-5">
              <div>
                <Label className="text-zinc-300 mb-2 block">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    data-testid="login-email-input"
                    type="email"
                    required
                    placeholder="tu@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-amber-500/20"
                  />
                </div>
              </div>
              <div>
                <Label className="text-zinc-300 mb-2 block">Contrasena</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    data-testid="login-password-input"
                    type="password"
                    required
                    placeholder="Tu contrasena"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-amber-500/20"
                  />
                </div>
              </div>
              <Button
                data-testid="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-amber-500 text-black hover:bg-amber-600 h-11 font-semibold"
              >
                {loading ? "Cargando..." : "Iniciar sesion"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="mt-6 space-y-5">
              {/* Role Toggle */}
              <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-full">
                <button
                  data-testid="register-role-client"
                  type="button"
                  onClick={() => setRole("client")}
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                    role === "client"
                      ? "bg-amber-500 text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Soy cliente
                </button>
                <button
                  data-testid="register-role-barber"
                  type="button"
                  onClick={() => setRole("barber")}
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                    role === "barber"
                      ? "bg-amber-500 text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Soy barbero
                </button>
              </div>

              <div>
                <Label className="text-zinc-300 mb-2 block">Nombre</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    data-testid="register-name-input"
                    required
                    placeholder="Tu nombre completo"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-amber-500/20"
                  />
                </div>
              </div>
              <div>
                <Label className="text-zinc-300 mb-2 block">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    data-testid="register-email-input"
                    type="email"
                    required
                    placeholder="tu@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-amber-500/20"
                  />
                </div>
              </div>
              <div>
                <Label className="text-zinc-300 mb-2 block">Contrasena</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    data-testid="register-password-input"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Min. 6 caracteres"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-amber-500 focus:ring-amber-500/20"
                  />
                </div>
              </div>
              <Button
                data-testid="register-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-amber-500 text-black hover:bg-amber-600 h-11 font-semibold"
              >
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs text-zinc-500">o continua con</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Google Button */}
        <Button
          data-testid="google-login-btn"
          variant="outline"
          onClick={handleGoogle}
          className="w-full rounded-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white h-11"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </Button>
      </div>
    </div>
  );
}
