export type DaySummaryTask = {
  id: string;
  title: string;
  estimatedMinutes: number;
  status: "pending" | "complete" | "partial" | "incomplete";
};

export type DaySummary = {
  total: number;
  completed: number;
  partial: number;
  pending: number;
  incomplete: number;
  completionRatio: number;
  totalEstimatedMinutes: number;
  completedMinutes: number;
};
