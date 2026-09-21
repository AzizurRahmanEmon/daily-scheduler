import type { blockSourceEnum, blockTypeEnum } from "@/db/schema";
import { minutesToTime } from "@/lib/time-of-day";
import type { ScheduleBlock } from "./types";

type BlockType = (typeof blockTypeEnum.enumValues)[number];
type BlockSource = (typeof blockSourceEnum.enumValues)[number];

export type PersistedScheduleBlock = {
  type: BlockType;
  source: BlockSource;
  title: string;
  startTime: string;
  endTime: string;
  sourceId: string | null;
};

function minutesToPgTime(minutes: number): string {
  return `${minutesToTime(minutes)}:00`;
}

export function mapScheduleBlockToRow(block: ScheduleBlock): PersistedScheduleBlock {
  const source: BlockSource =
    block.type === "meal" || block.type === "appointment"
      ? "manual"
      : block.type === "calendar_event"
        ? "calendar"
        : "ai_generated";

  return {
    type: block.type,
    source,
    title: block.title,
    startTime: minutesToPgTime(block.startMinutes),
    endTime: minutesToPgTime(block.endMinutes),
    sourceId: block.sourceId,
  };
}

export function mapScheduleBlocksToRows(
  blocks: ScheduleBlock[],
): PersistedScheduleBlock[] {
  return blocks.map(mapScheduleBlockToRow);
}
