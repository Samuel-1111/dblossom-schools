import Link from "next/link";
import { PublicSectionPage } from "../public-section/PublicSectionPage";

export default function EventsPage() {
  return <PublicSectionPage eyebrow="Events and News" title="What is happening at D'Blossom" intro="Keep up with school activities, celebrations, learning moments, and community events as they are published by the administration."><div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><h2 className="font-serif text-2xl font-bold text-blue-950">Upcoming school events</h2><p className="mt-4 leading-8 text-slate-600">The latest event notices are managed in the Admin Portal and displayed on the homepage with their dates and images.</p><Link href="/#events" className="mt-6 inline-flex rounded-md bg-amber-400 px-4 py-3 font-bold text-slate-950">View live events</Link></div></PublicSectionPage>;
}
