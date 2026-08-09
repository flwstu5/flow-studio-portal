import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import StaffSidebar from "../StaffSidebar";
import LeadsList from "./LeadsList";

export default async function StaffLeadsPage() {
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

  const { data: leads } = await admin
    .from("snapshot_leads")
    .select(
      "id, email, business, url, grade_letter, grade_percent, opportunity_count, created_at, nurture_3day_sent_at, nurture_7day_sent_at"
    )
    .order("created_at", { ascending: false });

  const { data: clients } = await admin.from("clients").select("email");

  const clientEmails = new Set((clients ?? []).map((c) => c.email?.toLowerCase()).filter(Boolean));

  const rows = (leads ?? []).map((lead) => ({
    ...lead,
    converted: clientEmails.has(lead.email?.toLowerCase()),
  }));

  const total = rows.length;
  const converted = rows.filter((r) => r.converted).length;
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

  return (
    <div className="min-h-screen flex bg-white">
      <StaffSidebar active="Leads" />

      <main className="flex-1 p-8 max-w-3xl">
        <h2 className="text-lg font-medium mb-6">Snapshot leads</h2>

        <div className="grid grid-cols-3 gap-px bg-neutral-200 rounded overflow-hidden mb-8">
          <Stat label="Total leads" value={total} />
          <Stat label="Converted" value={converted} />
          <Stat label="Conversion rate" value={`${conversionRate}%`} />
        </div>

        <LeadsList leads={rows} />
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

