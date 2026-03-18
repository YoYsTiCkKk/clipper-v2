import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, Scissors } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState("checking");
  const [attempts, setAttempts] = useState(0);

  const pollStatus = useCallback(async () => {
    if (!sessionId || attempts >= 5) {
      if (attempts >= 5) setStatus("timeout");
      return;
    }
    try {
      const res = await axios.get(`${API}/payments/status/${sessionId}`, { withCredentials: true });
      if (res.data.payment_status === "paid") {
        setStatus("success");
      } else if (res.data.status === "expired") {
        setStatus("failed");
      } else {
        setAttempts((a) => a + 1);
        setTimeout(() => pollStatus(), 2000);
      }
    } catch {
      setStatus("failed");
    }
  }, [sessionId, attempts]);

  useEffect(() => {
    pollStatus();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {status === "checking" && (
          <>
            <Loader2 className="w-16 h-16 text-amber-500 animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "Syne" }}>
              Verificando pago...
            </h1>
            <p className="text-zinc-400">Un momento, estamos procesando tu pago.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center mx-auto mb-6 animate-pulse-amber">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "Syne" }}>
              Pago confirmado
            </h1>
            <p className="text-zinc-400 mb-8">Tu reserva ha sido confirmada. El barbero recibira tu cita.</p>
            <Button
              data-testid="go-to-bookings-btn"
              onClick={() => navigate("/bookings")}
              className="rounded-full bg-amber-500 text-black hover:bg-amber-600 h-11 px-8 font-semibold"
            >
              <Scissors className="w-4 h-4 mr-2" />
              Ver mis reservas
            </Button>
          </>
        )}

        {(status === "failed" || status === "timeout") && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center mx-auto mb-6">
              <X className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "Syne" }}>
              {status === "timeout" ? "Tiempo agotado" : "Error en el pago"}
            </h1>
            <p className="text-zinc-400 mb-8">
              {status === "timeout"
                ? "No pudimos verificar tu pago. Revisa tu correo para confirmacion."
                : "Hubo un problema con tu pago. Intentalo de nuevo."}
            </p>
            <Button
              data-testid="go-back-btn"
              onClick={() => navigate("/bookings")}
              className="rounded-full bg-zinc-800 text-white hover:bg-zinc-700 h-11 px-8"
            >
              Volver a mis reservas
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
