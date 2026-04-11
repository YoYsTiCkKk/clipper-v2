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
  //   null     → query terminó pero no existe usuario en la BD
  //   object   → usuario encontrado
  const dbUser = useQuery(api.users.getMe);

  // loading = true mientras:
  //   1. Clerk aún no ha cargado
  //   2. Clerk dice que SÍ estamos loggeados, pero Convex aún NO tiene el
  //      usuario en la BD. Esto cubre dos casos:
  //      - dbUser === undefined → la query aún está corriendo
  //      - dbUser === null → la query terminó pero SyncUserWithConvex aún no
  //        ha creado el registro. Debemos seguir esperando porque la mutación
  //        storeUser lo creará en breve y getMe se re-ejecutará reactivamente.
  const loading = !isLoaded || (isSignedIn === true && !dbUser);

  // isAuthenticated solo es true cuando tenemos el objeto completo de la BD
  const isAuthenticated = isSignedIn === true && !!dbUser;

  const value = {
    user: dbUser ?? null,  // Exponer null (no undefined) para consumidores
    isAuthenticated,
    login: () => {},
    logout: () => signOut(),
    checkAuth: async () => {},
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
