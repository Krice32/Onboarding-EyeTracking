export const PRIVACY_NOTICE_VERSION = "2026-04-11";

export const PRIVACY_KEYS = {
  analyticsConsent: "matraquinha_analytics_consent_v1",
  privacyNoticeVersion: "matraquinha_privacy_notice_version",
  participantCode: "matraquinha_participant_code",
} as const;

export type AnalyticsConsent = "unset" | "granted" | "denied";
