import { Link } from "react-router-dom";
import { usePrivacyConsent } from "@/context/PrivacyConsentContext";

const PrivacyConsentBanner = () => {
  const { hasResponded, grantAnalyticsConsent, denyAnalyticsConsent } = usePrivacyConsent();

  if (hasResponded) return null;

  return (
    <aside className="fixed left-4 right-4 bottom-24 z-[70] mx-auto w-auto max-w-2xl rounded-2xl border border-primary/25 bg-card/95 p-4 shadow-[0_12px_40px_hsl(var(--foreground)/0.16)] backdrop-blur-sm">
      <p className="text-sm font-semibold text-foreground">
        Coletamos metricas de navegacao para melhorar a acessibilidade (tempo de tarefa, erros e modo de uso), sem gravar ou enviar video da camera.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Você pode aceitar ou recusar essa coleta. O app continua funcionando mesmo se recusar.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={denyAnalyticsConsent}
          className="rounded-xl border border-primary/30 bg-card px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
          type="button"
        >
          Recusar coleta
        </button>

        <button
          onClick={grantAnalyticsConsent}
          className="rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground transition-opacity hover:opacity-95"
          type="button"
        >
          Aceitar coleta
        </button>

        <Link to="/privacidade" className="ml-auto text-xs font-bold text-primary underline-offset-2 hover:underline">
          Ler aviso completo
        </Link>
      </div>
    </aside>
  );
};

export default PrivacyConsentBanner;
