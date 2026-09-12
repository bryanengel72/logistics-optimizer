'use client';
import { useMemo, useState, type CSSProperties } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { driveLevel, money, monthlyDrives, type Load } from '@/lib/model';

type Driver = { email: string; name: string };
const ALL = '__all__';

/** Twelve-month heatmap of completed drives for one driver or the whole team. */
export default function DriveHeatmap({
  loads,
  drivers,
  initialDriver,
}: {
  loads: Load[];
  drivers: Driver[];
  initialDriver: string;
}) {
  const hasOwn = useMemo(
    () =>
      !!initialDriver &&
      loads.some((l) => l.status === 'Delivered' && l.driver === initialDriver),
    [loads, initialDriver],
  );
  const [driver, setDriver] = useState(hasOwn ? initialDriver : ALL);
  const months = useMemo(
    () => monthlyDrives(loads, driver === ALL ? '' : driver),
    [loads, driver],
  );
  const max = Math.max(0, ...months.map((m) => m.drives));
  const total = months.reduce((s, m) => s + m.drives, 0);
  const miles = months.reduce((s, m) => s + m.miles, 0);
  const step = (k: number) => Math.max(1, Math.ceil((max * k) / 4));
  const who =
    driver === ALL
      ? 'the team'
      : drivers.find((d) => d.email === driver)?.name || driver;
  return (
    <section className="panel" aria-label="Completed drives by month">
      <div className="panel-head">
        <div>
          <h2>Completed drives</h2>
          <small>Delivered loads by month over the last year</small>
        </div>
        {drivers.length > 0 && (
          <Select value={driver} onValueChange={(v) => v && setDriver(v)}>
            <SelectTrigger aria-label="Choose a driver" className="drives-pick">
              <span>{driver === ALL ? 'All drivers' : who}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All drivers</SelectItem>
              {drivers.map((d) => (
                <SelectItem key={d.email} value={d.email}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="drives-body">
        <ul className="drives-grid">
          {months.map((m, i) => {
            const level = driveLevel(m.drives, max);
            const detail = m.drives
              ? `${m.drives} drive${m.drives === 1 ? '' : 's'} · ${m.miles.toLocaleString()} mi · ${money(m.pay)}`
              : 'No drives';
            return (
              <li key={m.key}>
                <button
                  type="button"
                  className="drive-cell"
                  data-level={level}
                  style={{ '--i': i } as CSSProperties}
                  aria-label={`${m.label} ${m.year}: ${detail}`}
                >
                  <span className="drive-month">
                    {m.month === 1 || i === 0
                      ? `${m.label} ’${String(m.year).slice(2)}`
                      : m.label}
                  </span>
                  <strong>{m.drives}</strong>
                  <span className="drive-tip" aria-hidden="true">
                    {m.label} {m.year} · {detail}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="drives-foot">
          <span>
            {total === 0
              ? `No completed drives for ${who} yet. Mark a load as delivered to start the record.`
              : `${total} drive${total === 1 ? '' : 's'} in the last 12 months · ${miles.toLocaleString()} loaded miles`}
          </span>
          <span className="drives-legend" aria-hidden="true">
            Less
            <i data-level="0" title="0 drives" />
            <i data-level="1" title={`Up to ${step(1)}`} />
            <i data-level="2" title={`Up to ${step(2)}`} />
            <i data-level="3" title={`Up to ${step(3)}`} />
            <i data-level="4" title={`Up to ${step(4)}`} />
            More
          </span>
        </div>
      </div>
    </section>
  );
}
