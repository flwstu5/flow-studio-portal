import Link from "next/link";
import { createRequest } from "./actions";

export default function NewRequestPage() {
  return (
    <main className="min-h-screen bg-white flex justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/dashboard" className="text-xs text-neutral-400">
          ← Back to dashboard
        </Link>

        <div className="flex items-center gap-2 mt-4 mb-8">
          <div className="w-6 h-6 rounded-md bg-brand-dark" />
          <span className="text-sm font-medium">Flow Studio</span>
        </div>

        <h1 className="text-xl font-medium mb-1">New request</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Tell us what you need — we'll pick it up from here.
        </p>

        <form action={createRequest} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-600">
              Title
            </label>
            <input
              name="title"
              type="text"
              required
              placeholder="e.g. Weekend brunch flyer"
              className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-600">
              Type
            </label>
            <select
              name="type"
              defaultValue="flyer"
              className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light bg-white"
            >
              <option value="flyer">Flyer</option>
              <option value="logo">Logo</option>
              <option value="brand">Brand design</option>
              <option value="web">Website</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-600">
              Brief
            </label>
            <textarea
              name="brief"
              required
              rows={5}
              placeholder="What's this for? Include dates, sizes, wording, or anything else we should know."
              className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-light resize-none"
            />
          </div>

          <button
            type="submit"
            className="bg-brand-dark text-white text-sm font-medium rounded px-3 py-2.5 mt-2"
          >
            Submit request
          </button>
        </form>
      </div>
    </main>
  );
}