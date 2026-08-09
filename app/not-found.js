import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <img src="/logo-icon.png" alt="Flow Studio" className="w-8 h-8 rounded" />
          <span className="text-sm font-medium">Flow Studio</span>
        </div>
        <h1 className="text-xl font-medium mb-2">Page not found</h1>
        <p className="text-sm text-neutral-500 mb-6">
          That page doesn't exist, or you may not have access to it.
        </p>
        <Link
          href="/"
          className="inline-block text-sm font-medium text-white rounded px-4 py-2"
          style={{ backgroundColor: "#CB181D" }}
        >
          Back to Flow Studio
        </Link>
      </div>
    </main>
  );
}
