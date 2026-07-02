import { useTranslations } from 'next-intl';
import { LogoMark } from './LogoMark';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';

type Screen = 'needHelp' | 'helpCenter' | 'map';

function FeedbackIcon() {
  // Megaphone — reads clearly as "give feedback / share your voice".
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

/**
 * Navy app header: brand mark + page title/subtitle on the start side,
 * language + dark-mode toggles (+ optional Feedback link) on the end side.
 * RTL-aware via logical properties (start/end).
 */
export function ScreenHeader({ screen }: { screen: Screen }) {
  const t = useTranslations('header');
  const ta = useTranslations('actions');
  // Configured at build via FEEDBACK_URL (points at the self-hosted Fider board).
  // Hidden until set, so it stays invisible until feedback hosting is live.
  const feedbackUrl = process.env.FEEDBACK_URL;

  return (
    <header className="rounded-b-card bg-primary px-md pb-lg pt-md text-text-inverse shadow-card">
      <div className="flex items-start justify-between gap-md">
        <div className="flex items-start gap-sm">
          <LogoMark />
          <div className="flex flex-col gap-1 pt-0.5">
            <h1 className="font-heading text-xl font-bold leading-tight">
              {t(`${screen}.title`)}
            </h1>
            <p className="text-sm text-text-inverse/80">{t(`${screen}.subtitle`)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {feedbackUrl && (
            <a
              href={feedbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-umami-event="feedback_open"
              aria-label={ta('feedback')}
              title={ta('feedback')}
              className="grid h-10 w-10 place-items-center rounded-pill bg-white/15 text-text-inverse transition-colors hover:bg-white/25"
            >
              <FeedbackIcon />
            </a>
          )}
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
