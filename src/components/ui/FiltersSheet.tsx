'use client';

import { useEffect, useMemo, useState } from 'react';

export interface ChipOption {
  id: string;
  label: string;
}

interface FiltersSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  districtLabel: string;
  serviceLabel: string;
  resetLabel: string;
  showMoreLabel: string;
  showLessLabel: string;
  applyLabel: (n: number) => string;
  districtOptions: ChipOption[];
  serviceOptions: ChipOption[];
  initialDistricts: string[];
  initialServices: string[];
  /** Live count for the current pending selection (debounced by the sheet). */
  fetchCount: (districts: string[], services: string[]) => Promise<number>;
  onApply: (districts: string[], services: string[]) => void;
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-primary-tint text-primary ring-1 ring-primary'
          : 'border border-black/10 bg-surface text-text-secondary'
      }`}
    >
      {label}
      {active && <span aria-hidden="true">×</span>}
    </button>
  );
}

const DISTRICT_PREVIEW = 10;

export function FiltersSheet(props: FiltersSheetProps) {
  const { open, onClose } = props;
  const [districts, setDistricts] = useState<string[]>(props.initialDistricts);
  const [services, setServices] = useState<string[]>(props.initialServices);
  const [showAll, setShowAll] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  // Re-sync local state whenever the sheet is (re)opened.
  useEffect(() => {
    if (open) {
      setDistricts(props.initialDistricts);
      setServices(props.initialServices);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Debounced live count for the pending selection.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setCount(null);
    const id = setTimeout(() => {
      props.fetchCount(districts, services).then((n) => {
        if (alive) setCount(n);
      });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, districts, services]);

  const visibleDistricts = useMemo(
    () => (showAll ? props.districtOptions : props.districtOptions.slice(0, DISTRICT_PREVIEW)),
    [showAll, props.districtOptions]
  );

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={props.title}>
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-screen-sm flex-col rounded-t-card bg-light shadow-card">
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-pill bg-black/20" />
        <div className="flex items-center justify-between px-md pb-2 pt-3">
          <h2 className="font-heading text-lg font-bold text-text-primary">{props.title}</h2>
          <button type="button" onClick={onClose} aria-label="close" className="text-2xl leading-none text-text-secondary">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-md pb-2">
          {props.districtOptions.length > 0 && (
            <section className="py-3">
              <h3 className="mb-2 text-sm font-semibold text-text-primary">{props.districtLabel}</h3>
              <div className="flex flex-wrap gap-2">
                {visibleDistricts.map((o) => (
                  <Chip
                    key={o.id}
                    label={o.label}
                    active={districts.includes(o.id)}
                    onClick={() => toggle(districts, setDistricts, o.id)}
                  />
                ))}
              </div>
              {props.districtOptions.length > DISTRICT_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setShowAll((s) => !s)}
                  className="mt-2 flex items-center gap-1 rounded-pill border border-black/10 bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary"
                >
                  {showAll ? props.showLessLabel : props.showMoreLabel}
                </button>
              )}
            </section>
          )}

          <section className="py-3">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">{props.serviceLabel}</h3>
            <div className="flex flex-wrap gap-2">
              {props.serviceOptions.map((o) => (
                <Chip
                  key={o.id}
                  label={o.label}
                  active={services.includes(o.id)}
                  onClick={() => toggle(services, setServices, o.id)}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="flex items-center gap-3 border-t border-black/10 px-md py-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          <button
            type="button"
            onClick={() => props.onApply(districts, services)}
            className="flex-1 rounded-button bg-primary px-md py-3 text-sm font-semibold text-text-inverse"
          >
            {props.applyLabel(count ?? 0)}
          </button>
          <button
            type="button"
            onClick={() => {
              setDistricts([]);
              setServices([]);
            }}
            className="rounded-button bg-primary-tint px-lg py-3 text-sm font-semibold text-primary"
          >
            {props.resetLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
