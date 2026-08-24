import { NextResponse } from "next/server";
import { storageGetSignedUrl } from "../../../server/storage";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const key = path.map((segment) => decodeURIComponent(segment)).join("/");
    if (!key || key.includes("..")) return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });

    const signedUrl = await storageGetSignedUrl(key);
    const asset = await fetch(signedUrl, { cache: "no-store" });
    if (!asset.ok || !asset.body) return NextResponse.json({ error: "Stored asset not found" }, { status: asset.status || 404 });

    const headers = new Headers();
    const contentType = asset.headers.get("content-type");
    const contentLength = asset.headers.get("content-length");
    if (contentType) headers.set("content-type", contentType);
    if (contentLength) headers.set("content-length", contentLength);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new NextResponse(asset.body, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Stored asset is temporarily unavailable" }, { status: 503 });
  }
}
