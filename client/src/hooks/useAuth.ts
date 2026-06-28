import { useUser } from "@clerk/clerk-react";
import type { User } from "@shared/schema";

export function useAuth() {
  const { isLoaded, isSignedIn, user } = useUser();

  const mappedUser: User | null = user
    ? {
        id: user.id,
        email:
          user.primaryEmailAddress?.emailAddress ??
          user.emailAddresses[0]?.emailAddress ??
          null,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        profileImageUrl: user.imageUrl ?? null,
        createdAt: null,
        updatedAt: null,
      }
    : null;

  return {
    user: mappedUser,
    isLoading: !isLoaded,
    isAuthenticated: !!isSignedIn,
  };
}
