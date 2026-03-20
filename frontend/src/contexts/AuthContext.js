import { createContext, useContext } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerkAuth();
  
  // Obtener el perfil completo (roles, metadata) de la BD de Convex
  // useQuery devuelve undefined mientras carga, null si no hay, y el objeto si existe.
  const dbUser = useQuery(api.users.getMe) || null;

  // Combinamos la bandera de carga de Clerk con el fetching de Convex
  const loading = !isLoaded || (isSignedIn && dbUser === undefined);

  const value = {
    user: dbUser,
    login: () => {}, // Clerk SignIn UI lo hace en /auth
    logout: () => signOut(),
    checkAuth: async () => {}, // Automático y reactivo en Convex
    loading: loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
