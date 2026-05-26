"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Button, Badge } from "@/components/ui";
import type { StepProps } from "../event-wizard";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
  assignee: { id: string; name: string } | null;
}

const STATUS_TONE: Record<string, "neutral" | "gold" | "warning" | "success" | "danger"> = {
  TODO: "neutral", IN_PROGRESS: "gold", BLOCKED: "danger", DONE: "success",
};

export function WorkspaceStep({ event, canEdit }: StepProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("2");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tasks?eventId=${event.id}`);
    if (res.ok) setTasks((await res.json()).data.tasks);
  }, [event.id]);

  useEffect(() => { load(); }, [load]);

  async function addTask() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, title, priority: Number(priority) }),
      });
      setTitle("");
      load();
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <h2 className="text-2xl">Workspace</h2>
      <p className="mt-2 text-sm text-ink-500">
        Built-in task management — assign work, track progress, and hit deadlines.
        Google Workspace read-only sync is available as an integration hook.
      </p>

      {canEdit && (
        <div className="mt-5 flex flex-wrap gap-2">
          <input className="input h-10 flex-1" placeholder="New task…" value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()} />
          <select className="input h-10 w-32" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="1">High</option>
            <option value="2">Medium</option>
            <option value="3">Low</option>
          </select>
          <Button variant="secondary" onClick={addTask} disabled={busy}>Add</Button>
        </div>
      )}

      <div className="mt-5 space-y-2">
        {tasks.length === 0 && <p className="text-sm text-ink-400">No tasks yet.</p>}
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full ${t.priority === 1 ? "bg-danger" : t.priority === 2 ? "bg-gold-500" : "bg-ink-300"}`} />
              <span className="text-sm font-medium text-ink-800">{t.title}</span>
              {t.assignee && <span className="text-xs text-ink-400">· {t.assignee.name}</span>}
            </div>
            <Badge tone={STATUS_TONE[t.status] ?? "neutral"}>{t.status}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
