import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import StaffSidebar from "../StaffSidebar";
import RewardStatusSelect from "./RewardStatusSelect";

const STATUS_LABELS = {
  pending: "Pending",
  redeemed: "Redeemed",
};

const REWARD_STYLES = {
  none: "bg-neutral-100 text-neutral-600",
  owed: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
};

export default async function StaffReferralsPage() {
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

  const admin = createAdminClient();

  const { data: referrals } = await admin
    .from("referrals")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = referrals ?? [];
  const redeemed = rows.filter((r) => r.status === "redeemed").length;
  const owed = rows.filter((r) => r.reward_status === "owed").length;
  const paid = rows.filter((r) => r.reward_status === "paid").length;

  return (
    <div className="min-h-screen flex bg-white">
      <StaffSidebar active="Referrals" />

      <main className="flex-1 p-8 max-w-4xl">
        <h2 className="text-lg font-medium mb-1">Referrals</h2>
        <p className="text-sm text-neutral-500 mb-6">
          Codes shared, redeemed, and reward status. Redemption just means the code was entered at intake — mark a
          reward owed once you've confirmed they became a paying subscriber.
        </p>

        <div className="grid grid-cols-3 gap-px bg-neutral-200 rounded overflow-hidden mb-8">
          <Stat label="Redeemed" value={redeemed} />
          <Stat label="Rewards owed" value={owed} />
          <Stat label="Rewards paid" value={paid} />
        </div>

        <div className="flex flex-col">
          {rows.length ? (
            rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-4 border-t border-neutral-200 py-3 last:border-b"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {r.referrer_name} <span className="text-neutral-400 font-normal">referred</span> {r.referred_business}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Code <span className="font-mono">{r.code}</span>
                    {" · "}
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        r.status === "redeemed" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                    {" · "}
                    {r.referrer_email}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${REWARD_STYLES[r.reward_status] ?? REWARD_STYLES.none}`}>
                    {r.reward_status === "paid" ? "Paid" : r.reward_status === "owed" ? "Owed" : "—"}
                  </span>
                  <RewardStatusSelect referralId={r.id} currentStatus={r.reward_status} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">No referrals yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white p-4 flex flex-col gap-1">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-lg font-medium">{value}</p>
    </div>
  );
}
