"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  generateJournal,
  regenerateJournal,
  saveJournalEdit,
} from "@/actions/journal";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import type { JournalStats } from "@/lib/journal/types";
import { journalHandwritten, journalSerif } from "@/lib/journal-fonts";

export type JournalEntryView = {
  content: string;
  generatedAt: string;
  editedAt: string | null;
};

type JournalPanelProps = {
  logId: string;
  dateHeader: string;
  logStatus: "draft" | "scheduled" | "in_progress" | "closed";
  entry: JournalEntryView | null;
  stats: JournalStats;
};

export function JournalPanel({
  logId,
  dateHeader,
  logStatus,
  entry,
  stats,
}: JournalPanelProps) {
  const router = useRouter();
  const [content, setContent] = useState(entry?.content ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setContent(entry?.content ?? "");
    setIsEditing(false);
    setConfirmRegenerate(false);
  }, [entry?.content, logId]);

  const isClosed = logStatus === "closed";
  const isReopened = !isClosed && Boolean(entry);
  const canWrite = isClosed;
  const canGenerate = isClosed && !entry;
  const canEdit = isClosed && Boolean(entry);
  const canRegenerate = isClosed && Boolean(entry);

  const statsItems = [
    { label: "Tasks", value: stats.tasksCompleteLabel },
    stats.wakeTimeLabel ? { label: "Wake time", value: stats.wakeTimeLabel } : null,
    stats.calendarLabel ? { label: "Calendar", value: stats.calendarLabel } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateJournal({ logId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setContent(result.content);
      setError(null);
      router.refresh();
    });
  }

  function handleSaveEdit() {
    startTransition(async () => {
      const result = await saveJournalEdit({ logId, content });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setContent(result.content);
      setIsEditing(false);
      setError(null);
      router.refresh();
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateJournal({ logId });
      if (!result.ok) {
        setError(result.error);
        setConfirmRegenerate(false);
        return;
      }
      setContent(result.content);
      setIsEditing(false);
      setConfirmRegenerate(false);
      setError(null);
      router.refresh();
    });
  }

  return (
    <article className="min-w-0 flex-1">
      <header className="mb-6 border-b border-amber-900/10 pb-5">
        <p
          className={`${journalHandwritten.className} text-4xl leading-tight text-amber-950/90 sm:text-5xl`}
        >
          {dateHeader}
        </p>
      </header>

      {statsItems.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
          {statsItems.map((stat) => (
            <span key={stat.label}>
              <span className="font-medium text-slate-400">{stat.label}</span>
              {" · "}
              <span className="text-slate-600">{stat.value}</span>
            </span>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {!isClosed && !entry && (
        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <p className="text-sm text-slate-600">
              This day is not closed yet. Finish your end-of-day review to
              generate a journal entry.
            </p>
            <ButtonLink href="/end-of-day">Go to end-of-day review</ButtonLink>
          </CardContent>
        </Card>
      )}

      {isReopened && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This day was reopened. The entry below is read-only and may be out of
          date until you close the day again.
        </p>
      )}

      {canGenerate && (
        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <p className="text-sm text-slate-600">
              No journal entry yet for this closed day.
            </p>
            <Button type="button" size="lg" disabled={isPending} onClick={handleGenerate}>
              {isPending ? "Generating…" : "Generate journal entry"}
            </Button>
          </CardContent>
        </Card>
      )}

      {entry && (
        <>
          {canEdit && !isEditing && (
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              {!confirmRegenerate ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setConfirmRegenerate(true)}
                >
                  Regenerate
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-600">
                    Replace this entry? Your edits will be lost.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={handleRegenerate}
                  >
                    Confirm regenerate
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setConfirmRegenerate(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}

          {isEditing && canWrite ? (
            <Card>
              <CardContent className="space-y-4 py-6">
                <Textarea
                  label="Journal entry"
                  rows={16}
                  value={content}
                  disabled={isPending}
                  onChange={(event) => setContent(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={handleSaveEdit}
                  >
                    Save edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => {
                      setContent(entry.content);
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-amber-900/10 bg-[#faf7f2] p-0 shadow-md">
              <CardContent className="relative p-0">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.45]"
                  style={{
                    backgroundImage: `
                      radial-gradient(circle at 20% 30%, rgba(180, 140, 90, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 80% 70%, rgba(160, 120, 80, 0.06) 0%, transparent 45%),
                      repeating-linear-gradient(
                        0deg,
                        transparent,
                        transparent 27px,
                        rgba(120, 100, 70, 0.04) 27px,
                        rgba(120, 100, 70, 0.04) 28px
                      )
                    `,
                  }}
                  aria-hidden="true"
                />
                <div className="relative px-6 py-8 sm:px-10 sm:py-10">
                  <p
                    className={`${journalSerif.className} whitespace-pre-wrap text-base leading-[1.85] text-slate-800 sm:text-lg`}
                  >
                    {content}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="mt-3 text-xs text-slate-500">
            Generated{" "}
            {new Date(entry.generatedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {entry.editedAt
              ? ` · Edited ${new Date(entry.editedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}`
              : ""}
          </p>
        </>
      )}

      {isClosed && (
        <div className="mt-8">
          <ButtonLink href="/wake-up" size="lg">
            Plan tomorrow
          </ButtonLink>
        </div>
      )}
    </article>
  );
}
