import { NextRequest, NextResponse } from "next/server";

const DEFAULT_PHP_API_URL = "http://localhost/Arozao%20Website/api";

export async function fetchPhpApi(
  request: NextRequest,
  endpoint: string,
  body?: unknown,
  method: string = request.method
): Promise<Response> {
  const baseUrl = (process.env.PHP_API_URL || DEFAULT_PHP_API_URL).replace(/\/+$/, "");
  const path = endpoint.replace(/^\/+/, "");
  const headers = new Headers({ Accept: "application/json" });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const authorization =
    request.headers.get("authorization") ||
    (request.cookies.get("arozao-access-token")?.value
      ? `Bearer ${request.cookies.get("arozao-access-token")?.value}`
      : "");
  if (authorization) headers.set("Authorization", authorization);

  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  } else if (!["GET", "HEAD"].includes(method.toUpperCase())) {
    requestBody = await request.arrayBuffer();
  }

  try {
    return await fetch(`${baseUrl}/${path}`, {
      method,
      headers,
      body: requestBody,
      cache: "no-store",
      redirect: "manual",
    });
  } catch (error) {
    console.error("[Arozao API proxy] PHP backend request failed:", error);
    return NextResponse.json(
      { ok: false, error: "The PHP backend is unavailable. Check Apache and MySQL." },
      { status: 502 }
    );
  }
}
