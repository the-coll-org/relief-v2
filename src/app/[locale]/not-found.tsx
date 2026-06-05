import { Link } from '@/i18n/routing';

/**
 * Locale-agnostic 404. Intentionally avoids useTranslations: this renders in
 * the root _not-found prerender where no message context exists.
 */
export default function NotFound() {
  return (
    <main className="grid flex-1 place-items-center px-md py-xl text-center">
      <div className="rounded-card bg-surface p-xl shadow-card">
        <p className="font-heading text-4xl font-bold text-primary">404</p>
        <Link
          href="/"
          className="mt-md inline-block rounded-button bg-primary px-lg py-2 text-sm font-semibold text-text-inverse"
        >
          ⌂
        </Link>
      </div>
    </main>
  );
}
