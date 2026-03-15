export type OfflineStage = 0 | 1 | 2 | 3 | 4 | 5

export const OFFLINE_STAGE_THRESHOLDS_MS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1:  5 * 60 * 1000,          // 5 min
  2:  3 * 60 * 60 * 1000,     // 3 hr
  3:  6 * 60 * 60 * 1000,     // 6 hr
  4: 12 * 60 * 60 * 1000,     // 12 hr
  5: 24 * 60 * 60 * 1000,     // 24 hr
}
