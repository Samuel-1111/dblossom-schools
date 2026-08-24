import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidLocalAdminToken, LOCAL_ADMIN_COOKIE } from "../../../../utils/local-admin";
import { createServiceClient } from "../../../../utils/supabase/service";
import { storagePut } from "../../../../server/storage";

export const dynamic = "force-dynamic";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const token = (await cookies()).get(LOCAL_ADMIN_COOKIE)?.value;
  if (!isValidLocalAdminToken(token)) return NextResponse.json({ error: "Administrator session required" }, { status: 401 });
  const form = await request.formData();
  const table = form.get("table");
  const id = form.get("id");
  const file = form.get("file");
  if (table !== "events" && table !== "gallery_images") return NextResponse.json({ error: "Media table must be events or gallery_images" }, { status: 400 });
  if (typeof id !== "string" || !id) return NextResponse.json({ error: "Media record id is required" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "An image file is required" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF images are allowed" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be 5 MB or smaller" }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const uploaded = await storagePut(`school-media/${table}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`, bytes, file.type);
  const { data, error } = await createServiceClient().from(table).update({ image_url: uploaded.url }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, url: uploaded.url });
}
