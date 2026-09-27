const localHost = window.location.hostname === "localhost" ? "localhost" : "127.0.0.1";
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || `http://${localHost}:8001`;

async function authRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Unable to reach Jarvis authentication. Check that the local API is running.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail;
    const error = new Error(typeof detail === "string" ? detail : `Authentication failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function getCurrentUser() {
  try {
    const data = await authRequest("/auth/me");
    return data.user;
  } catch (error) {
    if (error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function signIn(username, password) {
  const data = await authRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return data.user;
}

export async function signUp(username, password) {
  const data = await authRequest("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return data.user;
}

export function signOut() {
  return authRequest("/auth/logout", { method: "POST" });
}
