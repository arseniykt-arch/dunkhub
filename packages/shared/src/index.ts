export const CURRENT_CONSENT_VERSION = "2026-09-26.1";

export type ConsentScope = "anonymized_data_research" | "leaderboard_public";

export interface ConsentRecord {
  userId: string;
  scope: ConsentScope;
  version: string;
  acceptedAt: string;
}

export type JumpType = "standing_vertical" | "approach" | "reactive";

export interface JumpMeasurement {
  id: string;
  userId: string;
  type: JumpType;
  heightCm: number;
  flightTimeMs: number;
  contactTimeMs: number | null;
  leftLegLoadRatio: number | null;
  rightLegLoadRatio: number | null;
  capturedAt: string;
}

export interface TelegramInitData {
  userId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  authDate: number;
}
