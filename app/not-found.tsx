export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-4xl" style={{ color: "var(--navy)" }}>Page not found</h1>
        <p className="mt-3 text-slate-600">The page you requested does not exist.</p>
        <a href="/" className="mt-6 inline-block rounded-md px-4 py-2 text-white" style={{ background: "var(--navy)" }}>Return home</a>
      </div>
    </main>
  );
}
