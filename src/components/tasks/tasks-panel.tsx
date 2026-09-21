"use client";

import {
  useOptimistic,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  createTask,
  deleteTask,
  setTaskStatus,
  updateTask,
} from "@/actions/tasks";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type TaskListItem = {
  id: string;
  title: string;
  estimatedMinutes: number;
  status: "pending" | "complete" | "partial" | "incomplete";
};

type TasksPanelProps = {
  initialTasks: TaskListItem[];
  isReadOnly: boolean;
};

type OptimisticAction =
  | { type: "add"; task: TaskListItem }
  | { type: "delete"; taskId: string }
  | { type: "update"; task: TaskListItem }
  | { type: "status"; taskId: string; status: TaskListItem["status"] };

function applyOptimisticAction(
  tasks: TaskListItem[],
  action: OptimisticAction,
): TaskListItem[] {
  switch (action.type) {
    case "add":
      return [...tasks, action.task];
    case "delete":
      return tasks.filter((task) => task.id !== action.taskId);
    case "update":
      return tasks.map((task) =>
        task.id === action.task.id ? action.task : task,
      );
    case "status":
      return tasks.map((task) =>
        task.id === action.taskId ? { ...task, status: action.status } : task,
      );
    default:
      return tasks;
  }
}

function EditIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function nextStatus(
  status: TaskListItem["status"],
): TaskListItem["status"] {
  return status === "complete" ? "pending" : "complete";
}

export function TasksPanel({ initialTasks, isReadOnly }: TasksPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMinutes, setEditMinutes] = useState("30");
  const [optimisticTasks, applyOptimistic] = useOptimistic(
    initialTasks,
    applyOptimisticAction,
  );

  const totalMinutes = optimisticTasks.reduce(
    (sum, task) => sum + task.estimatedMinutes,
    0,
  );

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isReadOnly) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "");
    const estimatedMinutes = Number(formData.get("estimatedMinutes") ?? 30);

    const tempId = crypto.randomUUID();
    const optimisticTask: TaskListItem = {
      id: tempId,
      title: title.trim(),
      estimatedMinutes,
      status: "pending",
    };

    startTransition(async () => {
      applyOptimistic({ type: "add", task: optimisticTask });
      const result = await createTask({ title, estimatedMinutes });
      if (!result.ok) {
        applyOptimistic({ type: "delete", taskId: tempId });
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setError(null);
      form.reset();
    });
  }

  function startEditing(task: TaskListItem) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditMinutes(String(task.estimatedMinutes));
    setError(null);
  }

  function cancelEditing() {
    setEditingTaskId(null);
    setEditTitle("");
    setEditMinutes("30");
  }

  function handleSaveEdit(taskId: string) {
    if (isReadOnly) {
      return;
    }

    const previous = optimisticTasks.find((task) => task.id === taskId);
    if (!previous) {
      return;
    }

    const updated: TaskListItem = {
      ...previous,
      title: editTitle.trim(),
      estimatedMinutes: Number(editMinutes),
    };

    startTransition(async () => {
      applyOptimistic({ type: "update", task: updated });
      const result = await updateTask({
        taskId,
        title: editTitle,
        estimatedMinutes: Number(editMinutes),
      });
      if (!result.ok) {
        applyOptimistic({ type: "update", task: previous });
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setError(null);
      cancelEditing();
    });
  }

  function handleDelete(taskId: string) {
    if (isReadOnly) {
      return;
    }

    const previous = optimisticTasks.find((task) => task.id === taskId);
    if (!previous) {
      return;
    }

    startTransition(async () => {
      applyOptimistic({ type: "delete", taskId });
      const result = await deleteTask({ taskId });
      if (!result.ok) {
        applyOptimistic({ type: "add", task: previous });
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setError(null);
    });
  }

  function handleToggleStatus(task: TaskListItem) {
    if (isReadOnly) {
      return;
    }

    const newStatus = nextStatus(task.status);

    startTransition(async () => {
      applyOptimistic({ type: "status", taskId: task.id, status: newStatus });
      const result = await setTaskStatus({ taskId: task.id, status: newStatus });
      if (!result.ok) {
        applyOptimistic({
          type: "status",
          taskId: task.id,
          status: task.status,
        });
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setError(null);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-6">
        <p className="text-sm text-slate-600">
          Estimated time today:{" "}
          <span className="font-medium text-slate-900">{totalMinutes} min</span>
        </p>

        {isReadOnly && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This day is closed — tasks are read-only.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        {!isReadOnly && (
          <form
            onSubmit={handleAddTask}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <Input
              name="title"
              placeholder="What do you want to get done?"
              className="flex-1"
              disabled={isPending}
              required
            />
            <Input
              name="estimatedMinutes"
              type="number"
              min={5}
              max={480}
              defaultValue={30}
              label="Minutes"
              className="sm:w-28"
              disabled={isPending}
            />
            <Button className="shrink-0 sm:w-auto" type="submit" disabled={isPending}>
              Add
            </Button>
          </form>
        )}

        {optimisticTasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No tasks yet. Add your first task above.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {optimisticTasks.map((task) => (
              <li
                key={task.id}
                className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                {editingTaskId === task.id ? (
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
                    <Input
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      className="flex-1"
                      disabled={isPending}
                    />
                    <Input
                      type="number"
                      min={5}
                      max={480}
                      value={editMinutes}
                      onChange={(event) => setEditMinutes(event.target.value)}
                      label="Minutes"
                      className="sm:w-28"
                      disabled={isPending}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveEdit(task.id)}
                        disabled={isPending}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(task)}
                          disabled={isReadOnly || isPending}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                            task.status === "complete"
                              ? "bg-teal-100 text-teal-800"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          } ${isReadOnly ? "cursor-default opacity-60" : ""}`}
                        >
                          {task.status === "complete" ? "Done" : "Pending"}
                        </button>
                        <span
                          className={`text-sm ${
                            task.status === "complete"
                              ? "text-slate-500 line-through"
                              : "text-slate-800"
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className="text-xs text-slate-500">
                          {task.estimatedMinutes} min
                        </span>
                      </div>
                    </div>
                    {!isReadOnly && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => startEditing(task)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                          aria-label={`Edit ${task.title}`}
                          disabled={isPending}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(task.id)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          aria-label={`Delete ${task.title}`}
                          disabled={isPending}
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <ButtonLink href="/calendar-review" fullWidth variant="secondary" size="lg">
          Done adding tasks
        </ButtonLink>
      </CardContent>
    </Card>
  );
}
