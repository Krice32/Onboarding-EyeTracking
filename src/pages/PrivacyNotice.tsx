import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePrivacyConsent } from "@/context/PrivacyConsentContext";
import { PRIVACY_NOTICE_VERSION } from "@/constants/privacy";

const sessionFields = [
  "session_id",
  "participant_code (codigo aleatorio)",
  "started_at",
  "calibration_started",
  "calibration_completed",
  "calibration_duration_ms",
  "started_mode",
  "task_completed",
  "task_duration_ms",
  "selection_errors_count",
  "first_correct_selection_ms",
  "migrated_to_touch",
  "total_navigation_ms",
  "abandoned_eye_tracking_before_end",
  "used_eye_tracking_until_end",
];

const localStorageFields = [
  "matraquinha_tracking_mode",
  "matraquinha_eye_tracking_calibrated",
  "matraquinha_analytics_consent_v1",
  "matraquinha_privacy_notice_version",
  "matraquinha_participant_code (somente com consentimento de analytics)",
];

const PrivacyNotice = () => {
  const navigate = useNavigate();
  const { analyticsConsent, grantAnalyticsConsent, denyAnalyticsConsent } = usePrivacyConsent();

  const consentLabel =
    analyticsConsent === "granted"
      ? "Aceito"
      : analyticsConsent === "denied"
        ? "Recusado"
        : "Nao definido";

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-extrabold text-foreground">Aviso de Privacidade</h1>
          <div className="w-11" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 pt-5">
        <section className="rounded-2xl border border-primary/20 bg-card p-4">
          <p className="text-sm text-foreground">
            Este app segue os principios de finalidade, necessidade e transparencia da LGPD (arts. 6 e 9). A coleta de metricas de navegacao depende do seu consentimento.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Versao deste aviso: {PRIVACY_NOTICE_VERSION}</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-extrabold text-primary">Status da coleta de metricas</p>
          <p className="mt-1 text-sm text-foreground">Situacao atual: {consentLabel}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={grantAnalyticsConsent}
              className="rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
            >
              Aceitar coleta
            </button>
            <button
              type="button"
              onClick={denyAnalyticsConsent}
              className="rounded-xl border border-primary/30 bg-card px-3 py-2 text-xs font-bold text-primary"
            >
              Recusar coleta
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-extrabold text-primary">Dados tratados localmente no navegador</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {localStorageFields.map((field) => (
              <span key={field} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-foreground">
                {field}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-extrabold text-primary">Dados enviados para analytics (somente se aceito)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sessionFields.map((field) => (
              <span key={field} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-foreground">
                {field}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 text-sm text-foreground">
          <p className="font-extrabold text-primary">Sobre camera e eye tracking</p>
          <p className="mt-1">Quando voce escolhe usar camera, o app usa a imagem apenas em tempo real para estimar direcao do olhar.</p>
          <p className="mt-1">O video nao e gravado e nao e enviado para o endpoint de analytics.</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 text-sm text-foreground">
          <p className="font-extrabold text-primary">Finalidade e base legal</p>
          <p className="mt-1">Finalidade: medir usabilidade e acessibilidade do fluxo para melhorar o produto.</p>
          <p className="mt-1">Base legal: consentimento para coleta de metricas (art. 7, I da LGPD), com informacoes claras (art. 9).</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 text-sm text-foreground">
          <p className="font-extrabold text-primary">Direitos do titular (art. 18 da LGPD)</p>
          <p className="mt-1">Voce pode solicitar confirmacao de tratamento, acesso, correcao e eliminacao de dados pessoais, quando aplicavel.</p>
          <p className="mt-1">Contato do controlador/encarregado: privacy@seu-dominio.com (atualize este email antes de publicar).</p>
        </section>
      </main>
    </div>
  );
};

export default PrivacyNotice;
