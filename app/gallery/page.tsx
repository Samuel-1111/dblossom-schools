import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { PublicSectionPage } from "../public-section/PublicSectionPage";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  let items: Array<{ id: string; title: string; alt_text: string | null; image_url: string }> = [];
  let error = "";
  try {
    const result = await supabase.from("gallery_images").select("id, title, alt_text, image_url").order("created_at", { ascending: false }).limit(12);
    items = result.data ?? [];
    error = result.error?.message ?? "";
  } catch {
    error = "unavailable";
  }
  return <PublicSectionPage eyebrow="Gallery" title="Moments from school life" intro="Explore the people, places, and activities that make the D'Blossom learning community distinctive."><div>{error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">The school gallery is temporarily unavailable. Please try again later.</p> : items.length ? <div className="grid gap-5 sm:grid-cols-2">{items.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><img src={item.image_url} alt={item.alt_text || item.title} className="aspect-[4/3] w-full object-cover" loading="lazy" /><div className="p-5"><h2 className="text-xl font-semibold text-blue-950">{item.title}</h2></div></article>)}</div> : <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><h2 className="font-serif text-2xl font-bold text-blue-950">Live school gallery</h2><p className="mt-4 leading-8 text-slate-600">School life moments will appear here as the gallery is updated.</p></div>}<Link href="/#gallery" className="mt-6 inline-flex rounded-md bg-amber-400 px-4 py-3 font-bold text-slate-950">Back to homepage gallery</Link></div></PublicSectionPage>;
}
