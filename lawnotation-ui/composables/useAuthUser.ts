/**
 * The signed-in user, as the server's session knows it (see
 * server/api/auth/me.get.ts), or null. Loaded once per page load by
 * plugins/0.auth.ts; call refreshAuthUser() after changing the user's metadata.
 */
export type AuthUser = {
  id: string;
  email: string;
  role: "editor" | "annotator" | "admin";
  user_metadata: Record<string, any>;
};

export const useAuthUser = () => useState<AuthUser | null>("auth-user", () => null);

export async function refreshAuthUser() {
  const user = useAuthUser();
  const fetcher = import.meta.server ? useRequestFetch() : $fetch;
  user.value = (await fetcher<AuthUser | null>("/api/auth/me")) ?? null;
  return user.value;
}

/** Full-page navigations: the server routes set and clear the session cookie. */
export function signIn(returnTo?: string, email?: string) {
  const params = new URLSearchParams();
  if (returnTo) params.set("returnTo", returnTo);
  if (email) params.set("email", email);
  const query = params.toString();
  return navigateTo(`/api/auth/login${query ? `?${query}` : ""}`, { external: true });
}

export function signOut() {
  return navigateTo("/api/auth/logout", { external: true });
}
