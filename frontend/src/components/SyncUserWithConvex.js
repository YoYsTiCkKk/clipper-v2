import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export function SyncUserWithConvex() {
  const { user, isLoaded, isSignedIn } = useUser();
  const storeUser = useMutation(api.users.storeUser);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      storeUser({
        email: user.primaryEmailAddress?.emailAddress || "",
        name: user.fullName || user.firstName || "Usuario",
        role: user.publicMetadata?.role || "client", 
        picture: user.imageUrl
      }).catch(console.error);
    }
  }, [isLoaded, isSignedIn, user, storeUser]);

  return null;
}
