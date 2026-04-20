import { createContext, useContext } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerkAuth();
  
  // useQuery devuelve:
  //   undefined → query aún ejecutándose (Convex cargando)
  //   null     → query terminó pero no existe usuario en la BD (nuevo usuario)
  //   object   → usuario encontrado
  const dbUser = useQuery(api.users.getMe);

  // loading = true solo mientras:
  //   1. Clerk aún no ha cargado
  //   2. Clerk dice que SÍ estamos loggeados y la query Convex aún está corriendo (undefined)
  // Nota: dbUser === null con isSignedIn === true significa usuario NUEVO → no es loading
  const loading = !isLoaded || (isSignedIn === true && dbUser === undefined);

  // isNewUser = signed in via Clerk but has no DB record yet (needs role selection)
  const isNewUser = isSignedIn === true && dbUser === null;

  // isAuthenticated solo es true cuando tenemos el objeto completo de la BD
  const isAuthenticated = isSignedIn === true && !!dbUser;

  const value = {
    user: dbUser ?? null,  // Exponer null (no undefined) para consumidores
    isAuthenticated,
    isNewUser,
    login: () => {},
    logout: () => signOut(),
    checkAuth: async () => {},
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
