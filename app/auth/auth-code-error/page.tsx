export default function AuthCodeErrorPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-3xl" style={{ color: "var(--navy)" }}>Authentication link expired</h1>
        <p className="mt-3 text-slate-600">Please request a new sign-in link and try again.</p>
        <a href="/" className="mt-6 inline-block rounded-md px-4 py-2 text-white" style={{ background: "var(--navy)" }}>Return home</a>
      </div>
    </main>
  );
}
