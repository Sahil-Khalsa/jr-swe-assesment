import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiDownload, apiRequest, setUnauthorizedHandler } from "./client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

describe("apiRequest", () => {
  it("returns parsed JSON on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ id: 1 })));

    const result = await apiRequest<{ id: number }>("/files");

    expect(result).toEqual({ id: 1 });
  });

  it("sends a JSON body and Content-Type header when the json option is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/auth/login", {
      method: "POST",
      json: { email: "a@b.com", password: "x" },
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ email: "a@b.com", password: "x" }));
  });

  it("throws an ApiError carrying the backend's detail message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Incorrect email or password" }, 401)),
    );

    await expect(apiRequest("/auth/login", { method: "POST", json: {} })).rejects.toMatchObject({
      status: 401,
      message: "Incorrect email or password",
    });
  });

  it("triggers the unauthorized handler on a 401 when a token was sent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Invalid or expired token" }, 401)),
    );
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await expect(apiRequest("/files", { token: "stale-token" })).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not trigger the unauthorized handler on a 401 with no token (e.g. wrong-password login)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Incorrect email or password" }, 401)),
    );
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await expect(apiRequest("/auth/login", { method: "POST", json: {} })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("apiDownload", () => {
  it("returns the blob and the filename parsed from Content-Disposition", async () => {
    const response = new Response(new Blob(["hello"]), {
      status: 200,
      headers: { "Content-Disposition": 'attachment; filename="notes.txt"' },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    const { blob, filename } = await apiDownload("/files/abc/download", "tok");

    expect(filename).toBe("notes.txt");
    expect(await blob.text()).toBe("hello");
  });

  it("triggers the unauthorized handler on a 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Invalid or expired token" }, 401)),
    );
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await expect(apiDownload("/files/abc/download", "stale")).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
