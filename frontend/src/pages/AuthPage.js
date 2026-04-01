import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SignIn, SignUp, useUser } from "@clerk/clerk-react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSignedIn } = useUser();
  const dbUser = useQuery(api.users.getMe);
  const [tab] = useState(searchParams.get("tab") || "login");
  const role = searchParams.get("role");

  useEffect(() => {
    if (role === "barber") {
      localStorage.setItem("pendingRole", "barber");
    }
  }, [role]);

  useEffect(() => {
    if (isSignedIn && dbUser) {
      navigate(dbUser.role === "barber" ? "/dashboard" : "/feed", { replace: true });
    }
  }, [isSignedIn, dbUser, navigate]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      <button
        data-testid="auth-back-btn"
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Volver</span>
      </button>

      <div className="w-full max-w-md flex flex-col items-center">
        <div className="flex items-center gap-2 mb-8">
          <Logo className="w-7 h-7 text-amber-500" />
          <span className="text-2xl font-bold text-white" style={{ fontFamily: "Syne" }}>Trimmer</span>
        </div>

        <div className="w-full flex justify-center">
          {tab === "login" ? (
            <SignIn 
              routing="hash" 
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-zinc-900 border border-zinc-800 shadow-xl w-full",
                  headerTitle: "text-white",
                  headerSubtitle: "text-zinc-400",
                  socialButtonsBlockButton: "border-zinc-700 text-white hover:bg-zinc-800",
                  socialButtonsBlockButtonText: "text-zinc-300",
                  dividerText: "text-zinc-500",
                  dividerLine: "bg-zinc-800",
                  formFieldLabel: "text-zinc-300",
                  formFieldInput: "bg-zinc-950 border-zinc-800 text-white",
                  formButtonPrimary: "bg-amber-500 hover:bg-amber-600 text-black",
                  footerActionText: "text-zinc-400",
                  footerActionLink: "text-amber-500 hover:text-amber-400",
                }
              }}
            />
          ) : (
            <SignUp 
              routing="hash"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-zinc-900 border border-zinc-800 shadow-xl w-full",
                  headerTitle: "text-white",
                  headerSubtitle: "text-zinc-400",
                  socialButtonsBlockButton: "border-zinc-700 text-white hover:bg-zinc-800",
                  socialButtonsBlockButtonText: "text-zinc-300",
                  dividerText: "text-zinc-500",
                  dividerLine: "bg-zinc-800",
                  formFieldLabel: "text-zinc-300",
                  formFieldInput: "bg-zinc-950 border-zinc-800 text-white",
                  formButtonPrimary: "bg-amber-500 hover:bg-amber-600 text-black",
                  footerActionText: "text-zinc-400",
                  footerActionLink: "text-amber-500 hover:text-amber-400",
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
