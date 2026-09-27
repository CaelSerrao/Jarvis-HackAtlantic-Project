const STORAGE_KEY = "jarvis_placeholder_user";

const DEFAULT_USER = {
  id: "local_user",
  username: "local_user",
  name: "Jarvis User",
};

export async function getCurrentUser() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export async function signIn(username) {
  const normalizedUsername = username?.trim() || DEFAULT_USER.username;

  const user = {
    ...DEFAULT_USER,
    id: normalizedUsername,
    username: normalizedUsername,
    name: normalizedUsername,
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(user)
  );

  return user;
}

export async function signUp(username) {
  return signIn(username);
}

export async function signOut() {
  localStorage.removeItem(STORAGE_KEY);
  return { success: true };
}
