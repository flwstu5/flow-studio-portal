import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import StaffSidebar from "../StaffSidebar";

// PostgREST's .or() filter string treats , ( ) as syntax, and ILIKE treats
// % and _ as wildcards — strip/escape all of them so a search term can
// never break the query or match more broadly than intended.
function sanitizeTerm(raw) {
  return raw
    .replace(/[,()]/g, " ")
    .replace(/[%_]/g, "\\$&")
    .trim();
}

export default async function StaffSearchPage({ searchParams }) {
  const { q: rawQuery } = (await searchParams) ?? {};
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const staffEmails = (process.env.STAFF_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!staffEmails.includes(user.email.toLowerCase())) {
    redirect("/dashboard");
  }

  const query = (rawQuery ?? "").trim();
  const term = sanitizeTerm(query);

  let clients = [];
  let requests = [];
  let messages = [];

  if (term) {
    const admin = createAdminClient();
    const like = `%${term}%`;

    const [clientsResult, requestsResult, messagesResult] = await Promise.all([
      admin
        .from("clients")
        .select("id, business_name, email")
        .or(`business_name.ilike.${like},email.ilike.${like}`)
        .limit(20),
      admin
        .from("requests")
        .select("id, title, brief, type, clients(business_name, email)")
        .or(`title.ilike.${like},brief.ilike.${like}`)
        .limit(20),
      admin
        .from("messages")
        .select("id, body, request_id, requests(title, clients(business_name, email))")
        .ilike("body", like)
        .limit(20),
    ]);

    clients = clientsResult.data ?? [];
    requests = requestsResult.data ?? [];
    messages = messagesResult.data ?? [];
  }

  const totalResults = clients.length + requests.length + messages.length;

  return (
    <div className="min-h-screen flex bg-white">
      <StaffSidebar />

      <main className="flex-1 p-8 max-w-3xl">
        <h2 className="text-lg font-medium mb-1">Search</h2>
        <p className="text-sm text-neutral-500 mb-8">
          {query ? `Results for "${query}"` : "Search clients, requests, and messages."}
        </p>

        {query && totalResults === 0 && (
          <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
            No matches for "{query}".
          </p>
        )}

        {clients.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium mb-2">Clients</h3>
            <div className="flex flex-col">
              {clients.map((c) => (
                <Link
                  key={c.id}
                  href={`/staff/clients/${c.id}`}
                  className="flex items-center justify-between border-t border-neutral-200 py-3 last:border-b hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.business_name ?? c.email}</p>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate">{c.email}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {requests.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium mb-2">Requests</h3>
            <div className="flex flex-col">
              {requests.map((r) => (
                <Link
                  key={r.id}
                  href={`/staff/requests/${r.id}`}
                  className="flex items-center justify-between border-t border-neutral-200 py-3 last:border-b hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate">
                      {r.clients?.business_name ?? r.clients?.email ?? "Unknown client"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium mb-2">Messages</h3>
            <div className="flex flex-col">
              {messages.map((m) => (
                <Link
                  key={m.id}
                  href={`/staff/requests/${m.request_id}`}
                  className="flex flex-col border-t border-neutral-200 py-3 last:border-b hover:bg-neutral-50"
                >
                  <p className="text-xs text-neutral-500">
                    {m.requests?.title ?? "Untitled request"} ·{" "}
                    {m.requests?.clients?.business_name ?? m.requests?.clients?.email ?? "Unknown client"}
                  </p>
                  <p className="text-sm truncate mt-0.5">{m.body}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
