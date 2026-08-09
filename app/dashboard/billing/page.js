import Stripe from "stripe";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import Sidebar from "../Sidebar";
import BillingButton from "../BillingButton";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const STATUS_STYLES = {
  paid: "bg-green-100 text-green-700",
  open: "bg-amber-100 text-amber-700",
  uncollectible: "bg-red-100 text-red-700",
  void: "bg-neutral-100 text-neutral-500",
  draft: "bg-neutral-100 text-neutral-500",
};

export default async function BillingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("business_name, logo_path, stripe_customer_id")
    .eq("auth_user_id", user.id)
    .single();

  let invoices = [];
  let loadError = null;
  if (client?.stripe_customer_id) {
    try {
      const result = await stripe.invoices.list({
        customer: client.stripe_customer_id,
        limit: 24,
      });
      invoices = result.data;
    } catch (err) {
      console.error("Failed to load invoices:", err.message);
      loadError = "Couldn't load your invoice history right now.";
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      <Sidebar businessName={client?.business_name} userEmail={user.email} />

      <main className="flex-1 w-full p-4 sm:p-6 md:p-8 flex flex-col gap-6 max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Billing</h2>
          <BillingButton />
        </div>

        {!client?.stripe_customer_id && (
          <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">
            No billing account on file yet.
          </p>
        )}

        {loadError && <p className="text-sm text-red-600">{loadError}</p>}

        {client?.stripe_customer_id && !loadError && (
          <div className="flex flex-col">
            {invoices.length ? (
              invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-4 border-t border-neutral-200 py-3 last:border-b"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{formatAmount(inv.amount_paid ?? inv.amount_due, inv.currency)}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {formatDate(inv.created)}
                      {" · "}
                      <span className={`px-1.5 py-0.5 rounded capitalize ${STATUS_STYLES[inv.status] ?? "bg-neutral-100 text-neutral-500"}`}>
                        {inv.status}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {inv.hosted_invoice_url && (
                      <a
                        href={inv.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-[var(--brand-color)] border border-[var(--brand-light)] rounded px-2.5 py-1"
                      >
                        View
                      </a>
                    )}
                    {inv.invoice_pdf && (
                      <a
                        href={inv.invoice_pdf}
                        className="text-xs font-medium text-neutral-600 border border-neutral-300 rounded px-2.5 py-1"
                      >
                        PDF
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">No invoices yet.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function formatAmount(cents, currency) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: (currency ?? "usd").toUpperCase() }).format(
    cents / 100
  );
}

function formatDate(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
