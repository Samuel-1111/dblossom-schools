import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { PublicSectionPage } from "../public-section/PublicSectionPage";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  let items: Array<{ id: string; title: string; description: string | null; event_date: string; image_url: string | null }> = [];
  let error = "";
  try {
    const result = await supabase.from("events").select("id, title, description, event_date, image_url").order("event_date", { ascending: true }).limit(12);
    items = result.data ?? [];
    error = result.error?.message ?? "";
  } catch {
    error = "unavailable";
  }
  return <PublicSectionPage eyebrow="Events and News" title="What is happening at D'Blossom" intro="Keep up with school activities, celebrations, learning moments, and community events as they are published by the administration."><div>{error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">The school events calendar is temporarily unavailable. Please try again later.</p> : items.length ? <div className="grid gap-5">{items.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{item.image_url && <img src={item.image_url} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />}<div className="p-5"><p className="text-sm font-semibold text-red-600">{new Date(`${item.event_date}T00:00:00`).toLocaleDateString()}</p><h2 className="mt-2 text-xl font-semibold text-blue-950">{item.title}</h2><p className="mt-2 leading-7 text-slate-600">{item.description}</p></div></article>)}</div> : <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><h2 className="font-serif text-2xl font-bold text-blue-950">Upcoming school events</h2><p className="mt-4 leading-8 text-slate-600">Upcoming school events will appear here as the calendar is updated.</p></div>}<Link href="/#events" className="mt-6 inline-flex rounded-md bg-amber-400 px-4 py-3 font-bold text-slate-950">Back to homepage events</Link></div></PublicSectionPage>;
}
