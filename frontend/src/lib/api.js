import { supabase, isSupabaseConfigured } from "../auth/supabaseClient";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const LOCAL_STORAGE_SESSION_KEY = "astraforge_auth_session";

async function getAuthToken() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        return data.session.access_token;
      }
    } catch {
      // In case session lookup fails, fall through to storage check
    }
  }

  try {
    const raw =
      localStorage.getItem(LOCAL_STORAGE_SESSION_KEY) ||
      sessionStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      if (session?.access_token) {
        return session.access_token;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function api(path, { signal, body, headers = {} } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 90000);
  try {
    const token = await getAuthToken();
    const reqHeaders = {
      "Content-Type": "application/json",
      ...headers,
    };
    if (token) {
      reqHeaders["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(API_BASE + path, {
      signal: controller.signal,
      method: body === undefined ? "GET" : "POST",
      headers: reqHeaders,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 404 && path.startsWith("/api/")) {
        throw new Error(
          "This feature is missing from the running backend. Stop the project servers and restart with run.cmd, then try again.",
        );
      }
      const details = data.error?.details
        ?.map((d) => d.field.replace(/^body\./, "") + ": " + d.message)
        .join(" ");
      throw new Error(
        details || data.error?.message || data.detail || "The request could not be completed.",
      );
    }
    return data;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error.name === "AbortError")
      throw new Error("The request timed out. Please retry.");
    if (error instanceof TypeError || error instanceof SyntaxError)
      throw new Error(
        "Cannot reach the calculation service. Start the backend and retry.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export const productRequest = (product) => ({
  product_type: product.type,
  [product.type.toLowerCase() + "_config"]: product.config,
  ticker: product.ticker,
});
export const money = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
export const pct = (value) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }).format(value) + "%";
export const label = (value) =>
  (value || "Not assessed").replaceAll("_", " ").toLowerCase();
