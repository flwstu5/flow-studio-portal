"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStaffTask, toggleStaffTask, deleteStaffTask } from "../actions";

const TODAY = new Date().toISOString().split("T")[0];

export default function TasksClient({ openTasks, doneTasks }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      await createStaffTask(title, { notes, dueDate });
      setTitle("");
      setNotes("");
      setDueDate("");
      router.refresh();
    });
  }

  function handleToggle(taskId, done) {
    startTransition(async () => {
      await toggleStaffTask(taskId, done);
      router.refresh();
    });
  }

  function handleDelete(taskId) {
    startTransition(async () => {
      await deleteStaffTask(taskId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleAdd} className="border border-neutral-200 rounded p-3 flex flex-col gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task — e.g. Renew flowstudiogrfx.com domain"
          required
          className="border border-neutral-300 rounded px-2.5 py-1.5 text-sm"
        />
        <div className="flex gap-2">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="flex-1 border border-neutral-300 rounded px-2.5 py-1.5 text-sm"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border border-neutral-300 rounded px-2.5 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          className="self-start text-xs font-medium bg-brand-dark text-white rounded px-3 py-1.5 disabled:opacity-60"
        >
          Add task
        </button>
      </form>

      <div>
        <p className="text-xs font-medium text-neutral-500 mb-2">
          Open ({openTasks.length})
        </p>
        <div className="flex flex-col">
          {openTasks.length ? (
            openTasks.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} isPending={isPending} />
            ))
          ) : (
            <p className="text-sm text-neutral-500 border-t border-neutral-200 py-4">Nothing on the list.</p>
          )}
        </div>
      </div>

      {doneTasks.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="text-xs font-medium text-neutral-500 mb-2"
          >
            {showDone ? "Hide" : "Show"} completed ({doneTasks.length})
          </button>
          {showDone && (
            <div className="flex flex-col">
              {doneTasks.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} isPending={isPending} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete, isPending }) {
  const overdue = task.due_date && !task.done && task.due_date < TODAY;
  return (
    <div className="flex items-start justify-between gap-3 border-t border-neutral-200 py-2.5 last:border-b">
      <label className="flex items-start gap-2.5 min-w-0 cursor-pointer">
        <input
          type="checkbox"
          checked={task.done}
          disabled={isPending}
          onChange={(e) => onToggle(task.id, e.target.checked)}
          className="mt-0.5"
        />
        <span className="min-w-0">
          <span className={`text-sm block truncate ${task.done ? "line-through text-neutral-400" : "text-neutral-800"}`}>
            {task.title}
          </span>
          {(task.notes || task.due_date) && (
            <span className="text-xs text-neutral-500 block mt-0.5">
              {task.notes}
              {task.notes && task.due_date && " · "}
              {task.due_date && (
                <span className={overdue ? "text-red-600 font-medium" : ""}>
                  Due {formatDate(task.due_date)}
                </span>
              )}
            </span>
          )}
        </span>
      </label>
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        disabled={isPending}
        className="text-xs text-neutral-400 flex-shrink-0 disabled:opacity-60"
      >
        Delete
      </button>
    </div>
  );
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
