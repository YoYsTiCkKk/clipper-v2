import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export function SyncUserWithConvex() {
  const { user, isLoaded, isSignedIn } = useUser();
  const storeUser = useMutation(api.users.storeUser);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const pendingRole = localStorage.getItem("pendingRole");
      storeUser({
        email: user.primaryEmailAddress?.emailAddress || "",
        name: user.fullName || user.firstName || "Usuario",
        role: pendingRole || user.publicMetadata?.role || "client", 
        picture: user.imageUrl
      }).then(() => {
        // Clear pending role once stored successfully
        if (pendingRole) localStorage.removeItem("pendingRole");
      }).catch(console.error);
    }
  }, [isLoaded, isSignedIn, user, storeUser]);

  return null;
}
