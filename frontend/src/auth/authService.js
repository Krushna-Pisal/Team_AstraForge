import { supabase, isSupabaseConfigured } from "./supabaseClient";

const LOCAL_STORAGE_SESSION_KEY = "astraforge_auth_session";
const LOCAL_STORAGE_USERS_KEY = "astraforge_local_users";

// Default demo users available for development preview if Supabase isn't connected yet
const DEFAULT_DEV_USERS = [
  {
    id: "dev-rm-001",
    email: "rm@astraforge.com",
    password: "Password123!",
    user_metadata: {
      full_name: "Alexander Vance",
      role: "rm",
    },
    email_confirmed_at: new Date().toISOString(),
  },
  {
    id: "dev-client-001",
    email: "client@astraforge.com",
    password: "Password123!",
    user_metadata: {
      full_name: "Eleanor Sterling",
      role: "client",
    },
    email_confirmed_at: new Date().toISOString(),
  },
];

function getStoredLocalUsers() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(
        LOCAL_STORAGE_USERS_KEY,
        JSON.stringify(DEFAULT_DEV_USERS)
      );
      return DEFAULT_DEV_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DEV_USERS;
  }
}

function saveStoredLocalUsers(users) {
  try {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error("Failed to persist local users", err);
  }
}

/**
 * Format raw error messages into clean, user-friendly copy
 */
export function formatAuthError(error) {
  if (!error) return "An unexpected error occurred. Please try again.";
  const msg = error.message || error.toString();
  const lower = msg.toLowerCase();

  if (lower.includes("invalid login credentials") || lower.includes("invalid_grant")) {
    return "The email or password you entered is incorrect.";
  }
  if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
    return "Please verify your email before signing in.";
  }
  if (lower.includes("user already registered") || lower.includes("already registered") || lower.includes("unique constraint")) {
    return "An account with this email address already exists.";
  }
  if (lower.includes("password should be at least")) {
    return "Password must contain at least 8 characters.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network connection issue. Please check your internet connection.";
  }
  if (lower.includes("invalid token") || lower.includes("token has expired")) {
    return "This reset or verification link is invalid or has expired.";
  }

  return msg || "Something went wrong. Please try again.";
}

/**
 * Sign up a new user with Supabase Auth
 */
export async function signUpUser({ email, password, fullName, role = "client" }) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRole = role.toLowerCase() === "rm" ? "rm" : "client";

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role: normalizedRole,
        },
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });

    if (error) {
      throw new Error(formatAuthError(error));
    }

    // Try inserting/upserting profile if user ID exists immediately
    if (data?.user?.id) {
      try {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName.trim(),
          email: normalizedEmail,
          role: normalizedRole,
          updated_at: new Date().toISOString(),
        });
      } catch (profileErr) {
        // Handled by database trigger if RLS is restrictive
        console.warn("Direct profile insert notice:", profileErr);
      }
    }

    return {
      user: data.user,
      session: data.session,
      requiresEmailVerification: !data.user?.email_confirmed_at,
    };
  }

  // Local development / fallback simulation
  const localUsers = getStoredLocalUsers();
  const existing = localUsers.find((u) => u.email === normalizedEmail);
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const newUser = {
    id: `user-${Date.now()}`,
    email: normalizedEmail,
    password,
    user_metadata: {
      full_name: fullName.trim(),
      role: normalizedRole,
    },
    email_confirmed_at: null, // requires verification
    created_at: new Date().toISOString(),
  };

  localUsers.push(newUser);
  saveStoredLocalUsers(localUsers);
  
  // Call our backend to send the personalized HTML verification email
  try {
    fetch("http://127.0.0.1:8000/auth/send-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, name: fullName.trim() })
    }).catch(() => console.log("Backend not running, skipping email."));
  } catch (e) {
    // Ignore if backend is offline
  }

  return {
    user: newUser,
    session: null,
    requiresEmailVerification: true,
  };
}

/**
 * Sign in user with email & password
 */
export async function signInUser({ email, password, rememberMe = true }) {
  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      throw new Error(formatAuthError(error));
    }

    if (!data.user?.email_confirmed_at && data.user?.confirmed_at == null) {
      // In Supabase, if email confirmation is turned on
      // some projects may throw or return unconfirmed state
    }

    return {
      user: data.user,
      session: data.session,
    };
  }

  // Local fallback
  const localUsers = getStoredLocalUsers();
  const user = localUsers.find(
    (u) => u.email === normalizedEmail && u.password === password
  );

  if (!user) {
    throw new Error("The email or password you entered is incorrect.");
  }

  if (!user.email_confirmed_at) {
    const err = new Error("Please verify your email before signing in.");
    err.isUnverified = true;
    err.email = user.email;
    throw err;
  }

  const session = {
    access_token: `mock-token-${Date.now()}`,
    user,
    expires_at: Date.now() + 3600 * 1000 * 24 * 7,
  };

  if (rememberMe) {
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(session));
  } else {
    sessionStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(session));
  }

  return { user, session };
}

/**
 * Sign out current session
 */
export async function signOutUser() {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Supabase signOut error:", error);
    }
  }

  localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
  sessionStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
}

/**
 * Request password reset email
 */
export async function sendPasswordResetEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );
    if (error) {
      throw new Error(formatAuthError(error));
    }
    return data;
  }

  // Local mock
  const localUsers = getStoredLocalUsers();
  const exists = localUsers.find((u) => u.email === normalizedEmail);
  if (!exists) {
    // For security reasons in production we still pretend or succeed
    return true;
  }
  return true;
}

/**
 * Update user password
 */
export async function updateUserPassword(newPassword) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      throw new Error(formatAuthError(error));
    }
    return data;
  }

  // Local fallback
  return { success: true };
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });
    if (error) {
      throw new Error(formatAuthError(error));
    }
    return data;
  }

  // Local mock: mark as verified after simulated resend click
  const localUsers = getStoredLocalUsers();
  const index = localUsers.findIndex((u) => u.email === normalizedEmail);
  if (index !== -1) {
    localUsers[index].email_confirmed_at = new Date().toISOString();
    saveStoredLocalUsers(localUsers);
  }

  return { success: true };
}

/**
 * Verify email for local mock simulation or query token handler
 */
export async function verifyEmailToken(email) {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const localUsers = getStoredLocalUsers();
  const index = localUsers.findIndex((u) => u.email === normalizedEmail);
  if (index !== -1) {
    localUsers[index].email_confirmed_at = new Date().toISOString();
    saveStoredLocalUsers(localUsers);
    return true;
  }
  return false;
}

/**
 * Fetch profile data for authenticated user
 */
export async function getUserProfile(userId) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("Profile query notice:", error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn("Failed to fetch user profile", err);
      return null;
    }
  }
  return null;
}

/**
 * Get the initial session on startup
 */
export async function getInitialSession() {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  }

  try {
    const raw =
      localStorage.getItem(LOCAL_STORAGE_SESSION_KEY) ||
      sessionStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    return null;
  }
  return null;
}
