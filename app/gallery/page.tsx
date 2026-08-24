import Link from "next/link";
import { PublicSectionPage } from "../public-section/PublicSectionPage";

export default function GalleryPage() {
  return <PublicSectionPage eyebrow="Gallery" title="Moments from school life" intro="Explore the people, places, and activities that make the D'Blossom learning community distinctive."><div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><h2 className="font-serif text-2xl font-bold text-blue-950">Live school gallery</h2><p className="mt-4 leading-8 text-slate-600">The latest gallery images are managed by the school administration and displayed on the homepage as they are published.</p><Link href="/#gallery" className="mt-6 inline-flex rounded-md bg-amber-400 px-4 py-3 font-bold text-slate-950">View live gallery</Link></div></PublicSectionPage>;
}
