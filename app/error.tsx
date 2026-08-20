'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><section className="max-w-md rounded-xl border bg-white p-8 text-center shadow-sm"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-red-600">D'Blossom</p><h1 className="mt-3 text-2xl font-bold text-slate-900">Something went wrong</h1><p className="mt-3 text-slate-600">We could not load this school page. Please try again.</p><button type="button" onClick={() => reset()} className="mt-6 rounded-md bg-blue-900 px-5 py-3 font-semibold text-white">Try again</button></section></main>;
}
