import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import {
  signInUser,
  signUpUser,
  signOutUser,
  sendPasswordResetEmail,
  updateUserPassword,
  resendVerificationEmail,
  verifyEmailToken,
  getUserProfile,
  getInitialSession,
} from "./authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to extract role reliably from profile or metadata
  const extractRole = (userData, profileData) => {
    if (profileData?.role) {
      return profileData.role.toLowerCase() === "rm" ? "rm" : "client";
    }
    const metaRole =
      userData?.user_metadata?.role ||
      userData?.raw_user_meta_data?.role ||
      userData?.app_metadata?.role;
    return metaRole?.toLowerCase() === "rm" ? "rm" : "client";
  };

  const refreshProfileAndState = useCallback(async (activeUser, activeSession) => {
    if (!activeUser) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
      setLoading(false);
      return;
    }

    setUser(activeUser);
    setSession(activeSession || null);

    let userProfile = null;
    if (isSupabaseConfigured && activeUser.id) {
      userProfile = await getUserProfile(activeUser.id);
    }

    const resolvedRole = extractRole(activeUser, userProfile);
    setProfile(userProfile);
    setRole(resolvedRole);
    setLoading(false);
  }, []);

  // Initialize session on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session: initialSession } } = await supabase.auth.getSession();
          if (isMounted) {
            if (initialSession?.user) {
              await refreshProfileAndState(initialSession.user, initialSession);
            } else {
              setLoading(false);
            }
          }
        } else {
          // Local fallback session
          const initialSession = await getInitialSession();
          if (isMounted) {
            if (initialSession?.user) {
              await refreshProfileAndState(initialSession.user, initialSession);
            } else {
              setLoading(false);
            }
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    // Supabase Auth listener
    let authSubscription = null;
    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, currentSession) => {
          if (!isMounted) return;
          if (currentSession?.user) {
            await refreshProfileAndState(currentSession.user, currentSession);
          } else {
            setUser(null);
            setSession(null);
            setProfile(null);
            setRole(null);
            setLoading(false);
          }
        }
      );
      authSubscription = data.subscription;
    }

    return () => {
      isMounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [refreshProfileAndState]);

  const signIn = async ({ email, password, rememberMe }) => {
    const result = await signInUser({ email, password, rememberMe });
    await refreshProfileAndState(result.user, result.session);
    return result;
  };

  const signUp = async ({ email, password, fullName, role: chosenRole }) => {
    const result = await signUpUser({
      email,
      password,
      fullName,
      role: chosenRole,
    });
    return result;
  };

  const signOut = async () => {
    await signOutUser();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const sendResetLink = async (email) => {
    return await sendPasswordResetEmail(email);
  };

  const resetPassword = async (newPassword) => {
    return await updateUserPassword(newPassword);
  };

  const resendVerification = async (email) => {
    return await resendVerificationEmail(email);
  };

  const verifyEmail = async (email) => {
    return await verifyEmailToken(email);
  };

  const value = {
    user,
    session,
    profile,
    role,
    loading,
    isAuthenticated: Boolean(user),
    isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    sendResetLink,
    resetPassword,
    resendVerification,
    verifyEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
