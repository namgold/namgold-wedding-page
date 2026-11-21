export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

/** JSON fetch against the same-origin Go API. Never throws; failures come back as { ok: false, error }. */
export async function api<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
    });
    const body: unknown = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data: body as T };
    const code = (body as { error?: unknown })?.error;
    return { ok: false, error: typeof code === "string" ? code : "generic", status: res.status };
  } catch {
    return { ok: false, error: "network", status: 0 };
  }
}

export type PublicMessage = { id: number; name: string; message: string; createdAt: number };
