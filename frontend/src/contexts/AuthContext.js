import { createContext, useContext } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerkAuth();
  
  // useQuery devuelve:
  //   undefined → aun cargando
  //   null     → cargado pero no existe usuario en la BD
  //   object   → usuario encontrado
  // CRITICO: NO usar || null aquí, porque necesitamos distinguir undefined de null
  const dbUser = useQuery(api.users.getMe);

  // loading = true mientras:
  //   1. Clerk aún no ha cargado
  //   2. Clerk dice que SÍ estamos loggeados, pero Convex aún devuelve undefined (cargando)
  const loading = !isLoaded || (isSignedIn && dbUser === undefined);

  // isAuthenticated solo es true cuando tenemos el objeto completo de la BD
  const isAuthenticated = isSignedIn === true && dbUser != null;

  const value = {
    user: dbUser ?? null,  // Exponer null (no undefined) para consumidores, PERO solo tras loading=false
    isAuthenticated,
    login: () => {},
    logout: () => signOut(),
    checkAuth: async () => {},
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
