import { deliveryDate, type Load } from './model';
/** One fuel stop. Gallons and jurisdiction feed the IFTA worksheet. */
export type FuelEntry = {
  id: string;
  date: string;
  jurisdiction: string;
  fuelType: string;
  gallons: number;
  total: number;
  def: number;
  defTotal: number;
  odometer: number;
  loadId: string;
  driver: string;
  vendor: string;
  receipt: boolean;
  notes: string;
  sample?: boolean;
};
/** IFTA member jurisdictions: the 48 contiguous states and 10 Canadian provinces. */
export const jurisdictions: [string, string][] = [
  ['AL', 'Alabama'],
  ['AZ', 'Arizona'],
  ['AR', 'Arkansas'],
  ['CA', 'California'],
  ['CO', 'Colorado'],
  ['CT', 'Connecticut'],
  ['DE', 'Delaware'],
  ['FL', 'Florida'],
  ['GA', 'Georgia'],
  ['ID', 'Idaho'],
  ['IL', 'Illinois'],
  ['IN', 'Indiana'],
  ['IA', 'Iowa'],
  ['KS', 'Kansas'],
  ['KY', 'Kentucky'],
  ['LA', 'Louisiana'],
  ['ME', 'Maine'],
  ['MD', 'Maryland'],
  ['MA', 'Massachusetts'],
  ['MI', 'Michigan'],
  ['MN', 'Minnesota'],
  ['MS', 'Mississippi'],
  ['MO', 'Missouri'],
  ['MT', 'Montana'],
  ['NE', 'Nebraska'],
  ['NV', 'Nevada'],
  ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'],
  ['NY', 'New York'],
  ['NC', 'North Carolina'],
  ['ND', 'North Dakota'],
  ['OH', 'Ohio'],
  ['OK', 'Oklahoma'],
  ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'],
  ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'],
  ['SD', 'South Dakota'],
  ['TN', 'Tennessee'],
  ['TX', 'Texas'],
  ['UT', 'Utah'],
  ['VT', 'Vermont'],
  ['VA', 'Virginia'],
  ['WA', 'Washington'],
  ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
  ['AB', 'Alberta'],
  ['BC', 'British Columbia'],
  ['MB', 'Manitoba'],
  ['NB', 'New Brunswick'],
  ['NL', 'Newfoundland and Labrador'],
  ['NS', 'Nova Scotia'],
  ['ON', 'Ontario'],
  ['PE', 'Prince Edward Island'],
  ['QC', 'Quebec'],
  ['SK', 'Saskatchewan'],
];
export const jurisdictionCodes = jurisdictions.map((j) => j[0]);
export function jurisdictionName(code: string) {
  return jurisdictions.find((j) => j[0] === code)?.[1] || code;
}
/** "Atlanta, GA" → "GA". Returns '' when no two-letter code is present. */
export function stateOf(place: string) {
  const m = /,\s*([A-Za-z]{2})\b\s*$/.exec(place || '');
  return m ? m[1].toUpperCase() : '';
}
/** "2026-08-14" → "2026-Q3". */
export function quarterOf(date: string) {
  const m = Number(date.slice(5, 7));
  return `${date.slice(0, 4)}-Q${Math.floor((m - 1) / 3) + 1}`;
}
/** First and last day of a quarter such as "2026-Q3". */
export function quarterRange(q: string): [string, string] {
  const y = q.slice(0, 4),
    n = Number(q.slice(6));
  const start = (n - 1) * 3 + 1,
    end = start + 2;
  const last = new Date(Date.UTC(Number(y), end, 0)).getUTCDate();
  const mm = (m: number) => String(m).padStart(2, '0');
  return [`${y}-${mm(start)}-01`, `${y}-${mm(end)}-${last}`];
}
/** Filing deadline: the last day of the month after the quarter closes. */
export function quarterDue(q: string) {
  const y = Number(q.slice(0, 4)),
    n = Number(q.slice(6));
  const due = new Date(
    Date.UTC(n === 4 ? y + 1 : y, n === 4 ? 1 : n * 3 + 1, 0),
  );
  return due.toISOString().slice(0, 10);
}
/** Recent quarters, newest first. */
export function recentQuarters(today: string, count = 6) {
  const out: string[] = [];
  let y = Number(today.slice(0, 4)),
    n = Number(quarterOf(today).slice(6));
  for (let i = 0; i < count; i++) {
    out.push(`${y}-Q${n}`);
    n--;
    if (n === 0) {
      n = 4;
      y--;
    }
  }
  return out;
}
/**
 * Parses trip-sheet miles by jurisdiction, e.g. "GA 120, TN 130" or
 * "GA:120; TN:130". Returns null when the text cannot be read.
 */
export function parseStateMiles(text: string): Record<string, number> | null {
  const s = (text || '').trim();
  if (!s) return {};
  const out: Record<string, number> = {};
  for (const part of s.split(/[,;\n]+/)) {
    const m = /^\s*([A-Za-z]{2})\s*[:=\s]\s*(\d+(?:\.\d+)?)\s*$/.exec(part);
    if (!m) return null;
    const code = m[1].toUpperCase();
    out[code] = (out[code] || 0) + Number(m[2]);
  }
  return out;
}
/**
 * Miles by jurisdiction for one load. Trip-sheet miles win; otherwise the
 * loaded miles are split evenly between origin and destination states and
 * deadhead is charged to the origin state. Estimated rows are flagged.
 */
export function loadJurisdictionMiles(l: Load): {
  miles: Record<string, number>;
  estimated: boolean;
} {
  const recorded = parseStateMiles(l.stateMiles || '');
  if (recorded && Object.keys(recorded).length)
    return { miles: recorded, estimated: false };
  const a = stateOf(l.origin) || '??',
    b = stateOf(l.destination) || '??';
  const miles: Record<string, number> = {};
  if (a === b) miles[a] = l.miles + l.deadhead;
  else {
    miles[a] = l.miles / 2 + l.deadhead;
    miles[b] = (miles[b] || 0) + l.miles / 2;
  }
  return { miles, estimated: true };
}
export type IftaRow = {
  jurisdiction: string;
  name: string;
  miles: number;
  estimatedMiles: number;
  gallons: number;
  spend: number;
};
export type IftaWorksheet = {
  quarter: string;
  range: [string, string];
  due: string;
  rows: IftaRow[];
  totalMiles: number;
  estimatedMiles: number;
  totalGallons: number;
  spend: number;
  mpg: number;
  loads: number;
  stops: number;
};
/**
 * Builds the quarterly IFTA worksheet: miles per jurisdiction from delivered
 * loads in the quarter and tax-paid gallons from logged fuel stops.
 */
export function iftaWorksheet(
  loads: Load[],
  fuel: FuelEntry[],
  quarter: string,
  driver = '',
): IftaWorksheet {
  const range = quarterRange(quarter);
  const inQuarter = (d: string | null) => !!d && d >= range[0] && d <= range[1];
  const rows = new Map<string, IftaRow>();
  const row = (code: string) => {
    let r = rows.get(code);
    if (!r) {
      r = {
        jurisdiction: code,
        name: jurisdictionName(code),
        miles: 0,
        estimatedMiles: 0,
        gallons: 0,
        spend: 0,
      };
      rows.set(code, r);
    }
    return r;
  };
  let nLoads = 0,
    nStops = 0;
  for (const l of loads) {
    if (driver && l.driver !== driver) continue;
    if (!inQuarter(deliveryDate(l))) continue;
    nLoads++;
    const { miles, estimated } = loadJurisdictionMiles(l);
    for (const [code, m] of Object.entries(miles)) {
      const r = row(code);
      r.miles += m;
      if (estimated) r.estimatedMiles += m;
    }
  }
  for (const f of fuel) {
    if (driver && f.driver !== driver) continue;
    if (!inQuarter(f.date)) continue;
    nStops++;
    const r = row(f.jurisdiction);
    r.gallons += f.gallons;
    r.spend += f.total;
  }
  const list = [...rows.values()].sort((a, b) =>
    a.jurisdiction.localeCompare(b.jurisdiction),
  );
  const totalMiles = list.reduce((s, r) => s + r.miles, 0);
  const totalGallons = list.reduce((s, r) => s + r.gallons, 0);
  return {
    quarter,
    range,
    due: quarterDue(quarter),
    rows: list,
    totalMiles,
    estimatedMiles: list.reduce((s, r) => s + r.estimatedMiles, 0),
    totalGallons,
    spend: list.reduce((s, r) => s + r.spend, 0),
    mpg: totalGallons > 0 ? totalMiles / totalGallons : 0,
    loads: nLoads,
    stops: nStops,
  };
}
/**
 * DEF dosing presets. Modern SCR engines consume roughly 2–3% of diesel
 * volume as DEF; the exact rate depends on the engine and duty cycle.
 */
export const defPresets: { label: string; rate: number }[] = [
  {
    label: 'Class 8 tractor (Cummins X15, Detroit DD15, PACCAR MX-13)',
    rate: 3,
  },
  { label: 'Medium-duty truck (Cummins B6.7 or L9, Hino, Isuzu)', rate: 3 },
  { label: 'Diesel pickup (Power Stroke, Duramax, Cummins 6.7)', rate: 2.5 },
  {
    label: 'Diesel cargo or transit van (Sprinter, Transit, ProMaster)',
    rate: 2,
  },
  { label: 'No DEF (pre-2010 diesel or gasoline vehicle)', rate: 0 },
];
/** DEF gallons to add after buying `gallons` of diesel at a dosing rate in %. */
export function defNeeded(gallons: number, ratePct: number) {
  return (Math.max(0, gallons) * Math.max(0, ratePct)) / 100;
}
export type FuelReminder = {
  kind: 'log' | 'receipt' | 'filing';
  title: string;
  detail: string;
  loadId?: string;
  entryId?: string;
};
/**
 * Reminders that keep the IFTA file complete: loads on the road without a
 * logged fill-up, fill-ups without a saved receipt, and an approaching
 * quarterly deadline.
 */
export function fuelReminders(
  loads: Load[],
  fuel: FuelEntry[],
  today: string,
  driver = '',
): FuelReminder[] {
  const out: FuelReminder[] = [];
  const logged = new Set(fuel.map((f) => f.loadId).filter(Boolean));
  const weekAgo = new Date(`${today}T00:00:00Z`);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const recent = weekAgo.toISOString().slice(0, 10);
  for (const l of loads) {
    if (driver && l.driver !== driver) continue;
    if (logged.has(l.id) || l.miles + l.deadhead < 150) continue;
    if (l.status === 'In transit')
      out.push({
        kind: 'log',
        title: `Log fuel for ${l.origin} → ${l.destination}`,
        detail: `${l.order} is on the road with no fill-up recorded. Log each stop with the state, gallons, and total so the quarter's IFTA miles have matching fuel.`,
        loadId: l.id,
      });
    else if (l.status === 'Delivered') {
      const when = deliveryDate(l);
      if (when && when >= recent && !l.sample)
        out.push({
          kind: 'log',
          title: `No fuel receipt on ${l.order}`,
          detail: `Delivered ${when} without a logged fill-up. Add the receipt now while you still have it.`,
          loadId: l.id,
        });
    }
  }
  for (const f of fuel) {
    if (driver && f.driver !== driver) continue;
    if (!f.receipt)
      out.push({
        kind: 'receipt',
        title: `Save the receipt from ${f.date} in ${f.jurisdiction}`,
        detail: `${f.gallons} gal for ${money2(f.total)}. IFTA audits need the seller, date, jurisdiction, gallons, and price on every receipt for four years.`,
        entryId: f.id,
      });
  }
  const q = quarterOf(today);
  const [, end] = quarterRange(q);
  const daysToClose = Math.round(
    (Date.parse(end) - Date.parse(today)) / 86400000,
  );
  const prev = recentQuarters(today, 2)[1];
  const prevDue = quarterDue(prev);
  if (today <= prevDue) {
    const left = Math.round(
      (Date.parse(prevDue) - Date.parse(today)) / 86400000,
    );
    if (left <= 31)
      out.unshift({
        kind: 'filing',
        title: `${prev} IFTA return due ${prevDue}`,
        detail: `${left} day${left === 1 ? '' : 's'} left to file. Export the worksheet and reconcile it with your fuel receipts.`,
      });
  } else if (daysToClose <= 14)
    out.unshift({
      kind: 'filing',
      title: `${q} closes in ${daysToClose} day${daysToClose === 1 ? '' : 's'}`,
      detail: `The return is due ${quarterDue(q)}. Enter any missing fuel stops before the quarter ends.`,
    });
  return out;
}
function money2(n: number) {
  return `$${n.toFixed(2)}`;
}
/** Illustrative fuel stops matched to the sample delivered loads. */
export function seedFuel(loads: Load[]): FuelEntry[] {
  const delivered = loads.filter(
    (l) => l.sample && l.status === 'Delivered' && l.fuelType === 'Diesel',
  );
  return delivered.map((l, i) => {
    const gallons = Math.round((l.miles + l.deadhead) / l.mpg / 0.6) / 2;
    const code = i % 2 ? stateOf(l.destination) : stateOf(l.origin);
    return {
      id: `sample-fuel-${i + 1}`,
      date: deliveryDate(l) || l.date,
      jurisdiction: code || 'GA',
      fuelType: 'Diesel',
      gallons,
      total: Math.round(gallons * 3.65 * 100) / 100,
      def: Math.round(defNeeded(gallons, 3) * 10) / 10,
      defTotal: Math.round(defNeeded(gallons, 3) * 3.2 * 100) / 100,
      odometer: 0,
      loadId: l.id,
      driver: '',
      vendor: i % 3 === 0 ? 'Pilot' : i % 3 === 1 ? "Love's" : 'TA',
      receipt: i % 4 !== 3,
      notes: 'Illustrative fuel stop for the sample delivered load.',
      sample: true,
    };
  });
}
