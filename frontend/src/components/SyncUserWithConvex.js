import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function SyncUserWithConvex() {
  const { user, isLoaded, isSignedIn } = useUser();
  const storeUser = useMutation(api.users.storeUser);
  const dbUser = useQuery(api.users.getMe);

  useEffect(() => {
    if (isLoaded && isSignedIn && user && dbUser) {
      // Only sync profile updates for EXISTING users (name, picture changes)
      // New users are created via the RoleSelectionPage instead
      storeUser({
        email: user.primaryEmailAddress?.emailAddress || "",
        name: user.fullName || user.firstName || "Usuario",
        role: dbUser.role, // Keep their existing role
        picture: user.imageUrl
      }).catch(console.error);
    }
  }, [isLoaded, isSignedIn, user, storeUser, dbUser]);

  return null;
}
