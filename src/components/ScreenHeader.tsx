import { useTranslations } from 'next-intl';
import { LogoMark } from './LogoMark';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';

type Screen = 'needHelp' | 'helpCenter' | 'map';

/**
 * Navy app header: brand mark + page title/subtitle on the start side,
 * language + dark-mode toggles on the end side. Rendered at the top of each
 * screen. RTL-aware via logical properties (start/end).
 */
export function ScreenHeader({ screen }: { screen: Screen }) {
  const t = useTranslations('header');
  return (
    <header className="rounded-b-card bg-primary px-md pb-lg pt-md text-text-inverse shadow-card">
      <div className="flex items-start justify-between gap-md">
        <div className="flex items-start gap-sm">
          <LogoMark />
          <div className="flex flex-col gap-1 pt-0.5">
            <h1 className="font-heading text-xl font-bold leading-tight">
              {t(`${screen}.title`)}
            </h1>
            <p className="text-sm text-text-inverse/80">
              {t(`${screen}.subtitle`)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
