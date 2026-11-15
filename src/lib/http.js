// Talks to the local PIDA server (server/index.js). Every request carries the login cookie automatically.
export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export async function api(path, { method = "GET", body, headers, raw } = {}) {
  let res;
  try {
    res = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      headers: raw ? headers : body !== undefined ? { "Content-Type": "application/json", ...headers } : headers,
      body: raw ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Could not reach the server. Make sure it is running and try again.", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const fallback = res.status >= 500 || res.status === 404 && !data
      ? "Could not reach the server. Make sure it is running and try again."
      : "Something went wrong. Please try again.";
    throw new ApiError(data?.error || fallback, res.status);
  }
  return data;
}

// Uploaded files are served by the same server.
export const mediaUrl = (path) => (path ? "/uploads/" + path : "");
