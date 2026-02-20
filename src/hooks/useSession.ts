import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface SessionUser {
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface SessionResponse {
  user: SessionUser | null;
}

/**
 * Get current user session
 */
export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => apiClient.get<SessionResponse>("/api/auth/session"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

/**
 * Check if user has specific role
 */
export function useHasRole(role: string | string[]) {
  const { data } = useSession();
  
  if (!data?.user) return false;
  
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(data.user.role);
}

/**
 * Check if user is admin
 */
export function useIsAdmin() {
  return useHasRole("admin");
}

/**
 * Check if user can edit (admin or manager)
 */
export function useCanEdit() {
  return useHasRole(["admin", "manager"]);
}
