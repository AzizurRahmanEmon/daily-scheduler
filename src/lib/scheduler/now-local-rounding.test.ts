import { describe, expect, it } from "vitest";
import { END_OF_DAY_MINUTES, NOW_LOCAL_ROUND_MINUTES } from "./constants";
import { roundUpNowLocalMinutes } from "./now-local-rounding";

describe("roundUpNowLocalMinutes", () => {
  it("keeps values already on the grid", () => {
    expect(roundUpNowLocalMinutes(10 * 60)).toBe(10 * 60);
  });

  it("rounds up to the next boundary", () => {
    expect(roundUpNowLocalMinutes(10 * 60 + 7)).toBe(10 * 60 + 15);
  });

  it("clamps to the end of the day", () => {
    expect(roundUpNowLocalMinutes(END_OF_DAY_MINUTES - 1)).toBe(
      END_OF_DAY_MINUTES,
    );
  });

  it(`uses ${NOW_LOCAL_ROUND_MINUTES}-minute boundaries by default`, () => {
    expect(roundUpNowLocalMinutes(601)).toBe(615);
  });
});
