// Storage adapter for school media. Manus Forge remains the default provider in WebDev;
// downloaded deployments can set STORAGE_PROVIDER=supabase to use Supabase Storage.
import { createServiceClient } from "../utils/supabase/service";
import { ENV } from "./_core/env";

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function useSupabaseStorage(): boolean {
  return process.env.STORAGE_PROVIDER !== "forge";
}

function supabaseBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || "school-media";
}

async function supabaseStoragePut(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
): Promise<{ key: string; url: string }> {
  const bytes = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  const { error } = await createServiceClient().storage.from(supabaseBucket()).upload(key, bytes, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}. Create the configured bucket first.`);
  }
  const { data: publicData } = createServiceClient().storage.from(supabaseBucket()).getPublicUrl(key);
  return { key, url: publicData.publicUrl };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  if (useSupabaseStorage()) return supabaseStoragePut(key, data, contentType);

  const forgeUrl = ENV.forgeApiUrl!.replace(/\/+$/, "");
  const forgeKey = ENV.forgeApiKey!;
  const presignUrl = new URL("v1/storage/presign/put", `${forgeUrl}/`);
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data as any], { type: contentType });
  const uploadResp = await fetch(s3Url, { method: "PUT", headers: { "Content-Type": contentType }, body: blob });
  if (!uploadResp.ok) throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  if (useSupabaseStorage()) {
    const { data } = createServiceClient().storage.from(supabaseBucket()).getPublicUrl(key);
    return { key, url: data.publicUrl };
  }
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  if (useSupabaseStorage()) {
    const { data, error } = await createServiceClient().storage.from(supabaseBucket()).createSignedUrl(key, 3600);
    if (error || !data?.signedUrl) throw new Error(`Supabase Storage signed URL failed: ${error?.message ?? "empty URL"}`);
    return data.signedUrl;
  }
  const forgeUrl = ENV.forgeApiUrl!.replace(/\/+$/, "");
  const getUrl = new URL("v1/storage/presign/get", `${forgeUrl}/`);
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, { headers: { Authorization: `Bearer ${ENV.forgeApiKey!}` } });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }
  const { url } = (await resp.json()) as { url: string };
  return url;
}
