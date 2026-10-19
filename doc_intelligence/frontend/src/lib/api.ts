const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = Object.fromEntries(
    new Headers(init.headers).entries()
  ) as Record<string, string>;
  const token =
    typeof window === "undefined" ? null : localStorage.getItem("access_token");

  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === "authorization") delete headers[key];
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(apiUrl(path), { ...init, headers });
  if (
    response.status === 401 &&
    typeof window !== "undefined"
  ) {
    localStorage.clear();
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }
  return response;
}

export async function openProtectedFile(path: string): Promise<void> {
  const previewWindow = window.open("about:blank", "_blank");
  if (!previewWindow) {
    window.alert("Allow pop-ups to view this file.");
    return;
  }
  previewWindow.opener = null;

  try {
    const response = await apiFetch(path);
    if (!response.ok) {
      throw new Error(`Could not open file (${response.status})`);
    }
    const objectUrl = URL.createObjectURL(await response.blob());
    previewWindow.location.href = objectUrl;
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    previewWindow.close();
    console.error("Failed to open protected file:", error);
  }
}
