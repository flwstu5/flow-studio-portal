import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabaseServer";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import StaffSidebar from "../StaffSidebar";
import TasksClient from "./TasksClient";

export default async function StaffTasksPage() {
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

  const { data: tasks } = await admin
    .from("staff_tasks")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = tasks ?? [];

  // Open tasks: nearest due date first, then no-due-date tasks by newest.
  const openTasks = rows
    .filter((t) => !t.done)
    .sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return b.created_at.localeCompare(a.created_at);
    });

  const doneTasks = rows
    .filter((t) => t.done)
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

  return (
    <div className="min-h-screen flex bg-white">
      <StaffSidebar active="Tasks" />

      <main className="flex-1 p-8 max-w-2xl">
        <h2 className="text-lg font-medium mb-1">Tasks</h2>
        <p className="text-sm text-neutral-500 mb-6">
          Internal to-dos that aren't tied to a client request — domain renewals, vendor calls, and the like.
        </p>

        <TasksClient openTasks={openTasks} doneTasks={doneTasks} />
      </main>
    </div>
  );
}
