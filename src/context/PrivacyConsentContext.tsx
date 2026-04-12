import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { type AnalyticsConsent, PRIVACY_KEYS, PRIVACY_NOTICE_VERSION } from "@/constants/privacy";

interface PrivacyConsentContextValue {
  analyticsConsent: AnalyticsConsent;
  hasResponded: boolean;
  canCollectAnalytics: boolean;
  grantAnalyticsConsent: () => void;
  denyAnalyticsConsent: () => void;
}

const PrivacyConsentContext = createContext<PrivacyConsentContextValue | undefined>(undefined);

const readStoredConsent = (): AnalyticsConsent => {
  if (typeof window === "undefined") return "unset";

  const storedVersion = window.localStorage.getItem(PRIVACY_KEYS.privacyNoticeVersion);
  const storedConsent = window.localStorage.getItem(PRIVACY_KEYS.analyticsConsent);

  if (storedVersion !== PRIVACY_NOTICE_VERSION) return "unset";
  if (storedConsent === "granted" || storedConsent === "denied") return storedConsent;
  return "unset";
};

export const PrivacyConsentProvider = ({ children }: { children: ReactNode }) => {
  const [analyticsConsent, setAnalyticsConsent] = useState<AnalyticsConsent>(() => readStoredConsent());

  const persistConsent = useCallback((nextConsent: Exclude<AnalyticsConsent, "unset">) => {
    setAnalyticsConsent(nextConsent);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PRIVACY_KEYS.analyticsConsent, nextConsent);
    window.localStorage.setItem(PRIVACY_KEYS.privacyNoticeVersion, PRIVACY_NOTICE_VERSION);
  }, []);

  const grantAnalyticsConsent = useCallback(() => {
    persistConsent("granted");
  }, [persistConsent]);

  const denyAnalyticsConsent = useCallback(() => {
    persistConsent("denied");
  }, [persistConsent]);

  const value = useMemo(
    () => ({
      analyticsConsent,
      hasResponded: analyticsConsent !== "unset",
      canCollectAnalytics: analyticsConsent === "granted",
      grantAnalyticsConsent,
      denyAnalyticsConsent,
    }),
    [analyticsConsent, denyAnalyticsConsent, grantAnalyticsConsent]
  );

  return <PrivacyConsentContext.Provider value={value}>{children}</PrivacyConsentContext.Provider>;
};

export const usePrivacyConsent = () => {
  const context = useContext(PrivacyConsentContext);
  if (!context) {
    throw new Error("usePrivacyConsent must be used inside a PrivacyConsentProvider");
  }
  return context;
};
