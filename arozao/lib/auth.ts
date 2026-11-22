export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "seller" | "admin" | "super_admin";
};

/**
 * Ephemeral in-memory cache of the user identity.
 */
let verifiedSessionMemory: SessionUser | null = null;
let verifiedSessionExpiresAt = 0;
let inflightProfilePromise: Promise<SessionUser | null> | null = null;
const SESSION_CACHE_TTL_MS = 30_000;

/**
 * Clears non-HttpOnly session cookies in the browser.
 */
function clearBrowserAuthCookies(): void {
  if (typeof document === "undefined") return;
  document.cookie = "arozao-user-role=; Path=/; Max-Age=0; SameSite=Lax";
}

/**
 * The session token is HttpOnly; same-origin requests send it automatically.
 */
export function getAuthAccessToken(): string | null {
  return null;
}

/**
 * Returns the current in-memory user for synchronous UI rendering.
 */
export function getSessionUser(): SessionUser | null {
  return verifiedSessionMemory;
}

/**
 * Updates the in-memory user state and notifies UI listeners.
 */
export function setSessionUser(user: SessionUser | null): void {
  const prev = verifiedSessionMemory;
  const changed =
    (prev === null) !== (user === null) ||
    prev?.id !== user?.id ||
    prev?.role !== user?.role ||
    prev?.name !== user?.name ||
    prev?.email !== user?.email;

  verifiedSessionMemory = user;
  verifiedSessionExpiresAt = user ? Date.now() + SESSION_CACHE_TTL_MS : 0;

  if (typeof window !== "undefined") {
    if (changed) {
      window.dispatchEvent(new Event("arozao-auth-change"));
    }
  }
}

/**
 * Retrieves user identity from `/api/auth/me`.
 */
export async function fetchCurrentProfile(): Promise<SessionUser | null> {
  if (
    verifiedSessionMemory &&
    Date.now() < verifiedSessionExpiresAt
  ) {
    return verifiedSessionMemory;
  }

  if (inflightProfilePromise) {
    return inflightProfilePromise;
  }

  inflightProfilePromise = (async () => {
    const cookieToken = getAuthAccessToken();

    if (typeof document !== "undefined" && !cookieToken) {
      if (verifiedSessionExpiresAt === -1) {
        return null;
      }
    }

    try {
      const headers: Record<string, string> = {};
      if (cookieToken) {
        headers.Authorization = `Bearer ${cookieToken}`;
      }

      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers,
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data?.user) {
          const verifiedUser: SessionUser = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role || "customer",
          };
          setSessionUser(verifiedUser);
          return verifiedUser;
        }
      } else if (res.status === 401 || res.status === 403) {
        setSessionUser(null);
        verifiedSessionExpiresAt = -1;
        return null;
      }
    } catch {
      // Offline fallback
    }

    return verifiedSessionMemory;
  })().finally(() => {
    inflightProfilePromise = null;
  });

  return inflightProfilePromise;
}

/**
 * Authenticates credentials via `/api/auth/login`.
 */
export async function loginWithCredentials(
  email: string,
  password: string
): Promise<{ user: SessionUser | null; error?: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data?.ok || !data?.user) {
      setSessionUser(null);
      return { user: null, error: data?.error || "Invalid email or password." };
    }

    const verifiedUser: SessionUser = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role || "customer",
    };
    setSessionUser(verifiedUser);
    return { user: verifiedUser };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Registers a new customer account via `/api/auth/register`.
 */
export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<{
  user: SessionUser | null;
  requiresEmailConfirmation?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
        phone: input.phone?.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok || !data?.ok || !data?.user) {
      return { user: null, error: data?.error || "Registration failed." };
    }

    const resolvedUser: SessionUser = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: "customer",
    };

    setSessionUser(resolvedUser);

    return {
      user: resolvedUser,
      requiresEmailConfirmation: Boolean(data.requiresEmailConfirmation),
    };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Updates the authenticated user's profile.
 */
export async function updateUserProfile(input: {
  fullName?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  preferredLanguage?: string;
  newsletterSubscribed?: boolean;
  avatarUrl?: string;
}): Promise<{
  ok: boolean;
  user?: SessionUser & { phone?: string | null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile?: Record<string, any> | null;
  error?: string;
}> {
  const cookieToken = getAuthAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookieToken) {
    headers.Authorization = `Bearer ${cookieToken}`;
  }

  try {
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify(input),
    });

    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error || "Failed to update profile.",
      };
    }

    if (data.user) {
      const updatedSession: SessionUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role || "customer",
      };
      setSessionUser(updatedSession);
    }

    return {
      ok: true,
      user: data.user,
      profile: data.profile ?? null,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error while updating profile.",
    };
  }
}

/**
 * Signs out the user, clears session cookies, and resets in-memory state.
 */
export async function logoutUser(): Promise<void> {
  setSessionUser(null);
  if (typeof window !== "undefined") {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore
    }
    clearBrowserAuthCookies();
  }
}

/**
 * Builds the password recovery redirect URL.
 */
export function getPasswordResetRedirectUrl(originOverride?: string): string {
  const baseOrigin =
    originOverride && originOverride.startsWith("http")
      ? originOverride.replace(/\/+$/, "")
      : typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/+$/, "") ||
        "https://arozao.com";

  return `${baseOrigin}/login?mode=update-password`;
}

/**
 * Sends a password reset email via `/api/auth/forgot-password`.
 */
export async function requestPasswordReset(
  email: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const redirectTo = getPasswordResetRedirectUrl();

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "request",
        email: email.trim().toLowerCase(),
        redirectTo,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error:
          data?.error ||
          "Unable to send password reset email. Please try again.",
      };
    }

    return {
      ok: true,
      message:
        data.message ||
        "Password reset instructions have been sent to your email.",
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Network error while requesting password reset.",
    };
  }
}

/**
 * Completes a password update.
 */
export async function updatePasswordWithRecoveryToken(
  accessToken: string,
  newPassword: string,
  email?: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        token: accessToken,
        accessToken,
        email: email ? email.trim().toLowerCase() : undefined,
        newPassword,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error || "Failed to update password.",
      };
    }

    return {
      ok: true,
      message:
        data.message ||
        "Your password has been updated. Please sign in with your new password.",
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Network error while updating password.",
    };
  }
}
