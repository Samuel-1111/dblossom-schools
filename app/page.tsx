export const dynamic = "force-dynamic";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SCHOOL_LOGO = "/manus-storage/school-logo_15e2310a.jpg";
const HERO_IMAGE = "https://media.base44.com/images/public/69c481d93678fe5f1003a517/a857fe8fa_generated_f977333f.png";

export default async function HomePage() {
  // The public homepage must not parse or refresh user-auth cookies. A malformed
  // auth cookie should never turn a public read into a 500 response.
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  let gallery: Array<{ id: string; title: string; alt_text: string | null; image_url: string }> = [];
  let events: Array<{ id: string; title: string; description: string | null; event_date: string; image_url: string | null }> = [];
  let galleryLoadError = "";
  let eventsLoadError = "";
  try {
    const [{ data: galleryData, error: galleryError }, { data: eventsData, error: eventsError }] = await Promise.all([
      supabase.from("gallery_images").select("id, title, alt_text, image_url").order("created_at", { ascending: false }).limit(6),
      supabase.from("events").select("id, title, description, event_date, image_url").order("event_date", { ascending: true }).limit(6),
    ]);
    gallery = galleryData ?? [];
    events = eventsData ?? [];
    galleryLoadError = galleryError?.message ?? "";
    eventsLoadError = eventsError?.message ?? "";
  } catch {
    galleryLoadError = "unavailable";
    eventsLoadError = "unavailable";
  }
  return (
    <main>
      <header className="fixed inset-x-0 top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container flex h-20 items-center justify-between">
          <a href="#home" className="flex items-center gap-3">
            <img src={SCHOOL_LOGO} alt="D'Blossom Model Private Schools" className="h-10 w-10 rounded-full object-cover" />
            <strong className="text-lg" style={{ color: "var(--navy)" }}>D'Blossom</strong>
          </a>
          <nav className="hidden items-center gap-5 text-sm text-slate-600 lg:flex">
            <a href="#about">About</a><a href="#academics">Academics</a><a href="#gallery">Gallery</a><a href="#events">Events</a><a href="#payment">Payment</a><a href="#complaint">Complaint</a>
            <a href="/student-portal" className="rounded-md px-4 py-2 text-white" style={{ background: "var(--navy)" }}>Student Portal</a>
            <a href="/admin-login" className="rounded-md px-4 py-2" style={{ background: "var(--gold)" }}>Admin</a>
          </nav>
        </div>
      </header>
      <section id="home" className="relative flex min-h-screen items-center overflow-hidden pt-20" style={{ background: "var(--navy)" }}>
        <img src={HERO_IMAGE} alt="D'Blossom school community" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="relative container grid gap-12 py-24 text-white md:grid-cols-2">
          <div className="self-center">
            <p className="mb-5 inline-block rounded-full border px-3 py-1 text-sm" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>A school for becoming</p>
            <h1 className="max-w-2xl text-5xl leading-tight md:text-7xl">Where bright minds find their <em style={{ color: "var(--gold)" }}>becoming.</em></h1>
            <p className="mt-6 max-w-xl text-lg text-white/75">D'Blossom Model Private Schools nurtures capable, kind, and confident learners in Abeokuta, Ogun State.</p>
            <div className="mt-8 flex flex-wrap gap-3"><a href="#about" className="rounded-md px-5 py-3 font-semibold" style={{ background: "var(--gold)", color: "var(--ink)" }}>Discover our school</a><a href="/student-portal" className="rounded-md border border-white/40 px-5 py-3">Student Portal</a></div>
          </div>
          <div className="hidden self-center rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur md:block"><img src={HERO_IMAGE} alt="D'Blossom learning environment" className="aspect-[4/3] w-full rounded-xl object-cover" /><h2 className="mt-5 text-3xl">Education that feels like an invitation.</h2><p className="mt-3 text-white/70">Curiosity, discipline, and grace shape each learner's journey.</p></div>
        </div>
      </section>
      <section id="about" className="container grid gap-10 py-24 md:grid-cols-2"><div><p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--red)" }}>About D'Blossom</p><h2 className="mt-3 text-4xl" style={{ color: "var(--navy)" }}>A warm school with serious ambition.</h2></div><p className="text-lg leading-8 text-slate-600">We combine high expectations with a deep sense of belonging. Every child is known, challenged, and encouraged to grow through thoughtful teaching, strong character, and a clear pathway from JSS1 through SS3.</p></section>
      <section id="academics" className="bg-slate-50 py-24"><div className="container"><p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--red)" }}>Academics</p><h2 className="mt-3 text-4xl" style={{ color: "var(--navy)" }}>Learning with a longer view.</h2><div className="mt-10 grid gap-5 md:grid-cols-3">{["Early Years", "Basic Education", "Senior School"].map((item) => <article key={item} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><h3 className="text-2xl" style={{ color: "var(--navy)" }}>{item}</h3><p className="mt-3 text-slate-600">Strong foundations in curiosity, character, learning, and purposeful leadership.</p></article>)}</div></div></section>
      <section id="gallery" className="container py-24"><p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--red)" }}>Gallery</p><h2 className="mt-3 text-4xl" style={{ color: "var(--navy)" }}>A glimpse inside school life.</h2>{galleryLoadError ? <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">The school gallery is temporarily unavailable. Please try again later.</p> : gallery?.length ? <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{gallery.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><img src={item.image_url} alt={item.alt_text || item.title} className="aspect-[4/3] w-full object-cover" loading="lazy" /><div className="p-5"><h3 className="text-xl font-semibold" style={{ color: "var(--navy)" }}>{item.title}</h3></div></article>)}</div> : <p className="mt-6 text-slate-600">School life moments will appear here as the gallery is updated.</p>}</section>
      <section id="events" className="bg-slate-50 py-24"><div className="container"><p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--red)" }}>Events</p><h2 className="mt-3 text-4xl" style={{ color: "var(--navy)" }}>What is happening at D'Blossom.</h2>{eventsLoadError ? <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">The school events calendar is temporarily unavailable. Please try again later.</p> : events?.length ? <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{events.map((event) => <article key={event.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{event.image_url && <img src={event.image_url} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />}<div className="p-5"><p className="text-sm font-semibold" style={{ color: "var(--red)" }}>{new Date(`${event.event_date}T00:00:00`).toLocaleDateString()}</p><h3 className="mt-2 text-xl font-semibold" style={{ color: "var(--navy)" }}>{event.title}</h3><p className="mt-2 text-slate-600">{event.description}</p></div></article>)}</div> : <p className="mt-6 text-slate-600">Upcoming school events will appear here as the calendar is updated.</p>}</div></section>
      <section id="payment" className="container py-24"><h2 className="text-4xl" style={{ color: "var(--navy)" }}>Notify the school after payment.</h2></section>
      <section id="complaint" className="py-24 text-white" style={{ background: "var(--navy)" }}><div className="container"><h2 className="text-4xl">We are ready to listen.</h2></div></section>
    </main>
  );
}
