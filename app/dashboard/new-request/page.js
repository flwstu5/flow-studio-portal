import Link from "next/link";
import { createRequest } from "./actions";

const VALID_TYPES = new Set(["flyer", "logo", "brand", "web"]);

export default async function NewRequestPage({ searchParams }) {
  const params = (await searchParams) ?? {};
  const prefillTitle = typeof params.title === "string" ? params.title : "";
  const prefillType = VALID_TYPES.has(params.type) ? params.type : "flyer";
  const prefillBrief = typeof params.brief === "string" ? params.brief : "";

  return (
    <main className="min-h-screen bg-white flex justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/dashboard" className="text-xs text-neutral-400">
          ← Back to dashboard
        </Link>

        <div className="flex items-center gap-2 mt-4 mb-8">
          <img src="/logo-icon.png" alt="Flow Studio" className="w-6 h-6 rounded" />
          <span className="text-sm font-medium">Flow Studio</span>
        </div>

        <h1 className="text-xl font-medium mb-1">New request</h1>
        <p className="text-sm text-neutral-500 mb-6">
          {prefillBrief
            ? "Prefilled from a past request — edit anything before sending."
            : "Tell us what you need — we'll pick it up from here."}
        </p>

        <form action={createRequest} className="flex flex-col gap-4" encType="multipart/form-data">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-600">
              Title
            </label>
            <input
              name="title"
              type="text"
              required
              defaultValue={prefillTitle}
              placeholder="e.g. Weekend brunch flyer"
              className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-600">
              Type
            </label>
            <select
              name="type"
              defaultValue={prefillType}
              className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] bg-white"
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
              defaultValue={prefillBrief}
              placeholder="What's this for? Include dates, sizes, wording, or anything else we should know."
              className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)] resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="due-date" className="text-xs font-medium text-neutral-600">
              Need it by <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              id="due-date"
              name="dueDate"
              type="date"
              min={new Date().toISOString().split("T")[0]}
              className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-light)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-600">
              Reference file <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              name="referenceFile"
              type="file"
              accept="image/*,.pdf"
              className="text-sm text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-neutral-100 file:text-neutral-700"
            />
            <p className="text-xs text-neutral-400">A logo, inspiration image, or existing flyer to work from.</p>
          </div>

          <button
            type="submit"
            className="bg-[var(--brand-color)] text-white text-sm font-medium rounded px-3 py-2.5 mt-2"
          >
            Submit request
          </button>
        </form>
      </div>
    </main>
  );
}
