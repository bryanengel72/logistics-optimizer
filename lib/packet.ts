import { deliveryDate, type Load } from './model';
import type { FuelEntry, FuelReminder } from './ifta';
/** Paperwork status for one document in a trip packet. */
export type PacketStatus = 'Missing' | 'Attached' | 'Not needed';
export const packetStatuses: PacketStatus[] = [
  'Missing',
  'Attached',
  'Not needed',
];
export type PacketItem = {
  type: string;
  status: PacketStatus;
  /** Dollar amount for receipts; 0 for non-expense documents. */
  amount: number;
  date: string;
  note: string;
  /** Storage path once uploads are connected; empty until then. */
  file: string;
};
export type PacketType = {
  type: string;
  hint: string;
  expense: boolean;
  /** Required before a delivered load is considered settled. */
  required: boolean;
};
/** The documents a driveaway trip produces, in the order they happen. */
export const packetTypes: PacketType[] = [
  {
    type: 'Pickup inspection',
    hint: 'Gate pass or condition report signed at pickup',
    expense: false,
    required: true,
  },
  {
    type: 'Bill of lading',
    hint: 'Dispatch paperwork for the unit',
    expense: false,
    required: true,
  },
  {
    type: 'Pickup photos',
    hint: 'Walk-around photos before leaving the lot',
    expense: false,
    required: false,
  },
  {
    type: 'Delivery receipt',
    hint: 'Signed by the receiver at drop-off',
    expense: false,
    required: true,
  },
  {
    type: 'Delivery photos',
    hint: 'Walk-around photos at the receiver',
    expense: false,
    required: false,
  },
  {
    type: 'Fuel receipts',
    hint: 'One per fill-up; logged fuel stops count automatically',
    expense: true,
    required: false,
  },
  {
    type: 'Toll receipts',
    hint: 'Cash tolls or a transponder statement',
    expense: true,
    required: false,
  },
  {
    type: 'Lodging receipt',
    hint: 'Hotel folio for each night out',
    expense: true,
    required: false,
  },
  {
    type: 'Return ticket',
    hint: 'Flight, bus, or train home',
    expense: true,
    required: false,
  },
  {
    type: 'Other expense',
    hint: 'Permits, parking, supplies',
    expense: true,
    required: false,
  },
];
const noReturn = ['Team pickup', 'Next load nearby'];
/**
 * The full packet for a load: stored items merged over sensible defaults.
 * Fuel receipts are derived from logged fuel stops linked to the load.
 */
export function packetFor(l: Load, fuel: FuelEntry[] = []): PacketItem[] {
  const stored = new Map((l.packet || []).map((i) => [i.type, i]));
  const stops = fuel.filter((f) => f.loadId === l.id);
  return packetTypes.map((t) => {
    const s = stored.get(t.type);
    if (t.type === 'Fuel receipts' && stops.length)
      return {
        type: t.type,
        status: stops.every((f) => f.receipt) ? 'Attached' : 'Missing',
        amount: stops.reduce((a, f) => a + f.total + f.defTotal, 0),
        date:
          stops
            .map((f) => f.date)
            .sort()
            .pop() || '',
        note: `${stops.length} logged fill-up${stops.length === 1 ? '' : 's'}`,
        file: s?.file || '',
      };
    if (s) return { ...s, amount: Number(s.amount) || 0 };
    let status: PacketStatus = 'Missing',
      amount = 0;
    if (t.type === 'Toll receipts') {
      status = l.tolls > 0 ? 'Missing' : 'Not needed';
      amount = l.tolls;
    } else if (t.type === 'Lodging receipt')
      status = l.hotelNights > 0 ? 'Missing' : 'Not needed';
    else if (t.type === 'Return ticket') {
      status =
        l.returnCost > 0 && !noReturn.includes(l.returnMode || '')
          ? 'Missing'
          : 'Not needed';
      amount = l.returnCost;
    } else if (t.type === 'Other expense') {
      status = l.other > 0 ? 'Missing' : 'Not needed';
      amount = l.other;
    }
    return { type: t.type, status, amount, date: '', note: '', file: '' };
  });
}
export type PacketProgress = {
  items: PacketItem[];
  /** Documents that are needed (not marked "Not needed"). */
  total: number;
  attached: number;
  missing: string[];
  /** Required documents still missing. */
  missingRequired: string[];
  /** Sum of attached expense receipts. */
  documented: number;
  complete: boolean;
};
export function packetProgress(
  l: Load,
  fuel: FuelEntry[] = [],
): PacketProgress {
  const items = packetFor(l, fuel);
  const needed = items.filter((i) => i.status !== 'Not needed');
  const missing = needed
    .filter((i) => i.status === 'Missing')
    .map((i) => i.type);
  const required = new Set(
    packetTypes.filter((t) => t.required).map((t) => t.type),
  );
  const expense = new Set(
    packetTypes.filter((t) => t.expense).map((t) => t.type),
  );
  return {
    items,
    total: needed.length,
    attached: needed.filter((i) => i.status === 'Attached').length,
    missing,
    missingRequired: missing.filter((t) => required.has(t)),
    documented: items
      .filter((i) => i.status === 'Attached' && expense.has(i.type))
      .reduce((s, i) => s + i.amount, 0),
    complete: missing.length === 0,
  };
}
/** Strips derived and unchanged rows so only real edits are stored. */
export function packetToStore(items: PacketItem[]): PacketItem[] {
  return items
    .filter((i) => i.type !== 'Fuel receipts' || i.file)
    .map((i) => ({
      type: i.type,
      status: i.status,
      amount: Number(i.amount) || 0,
      date: i.date || '',
      note: (i.note || '').slice(0, 200),
      file: i.file || '',
    }));
}
/**
 * Delivered loads from the last two weeks that still lack a required
 * document, so the driver settles paperwork while it is fresh.
 */
export function packetReminders(
  loads: Load[],
  fuel: FuelEntry[],
  today: string,
  driver = '',
): FuelReminder[] {
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 14);
  const recent = cutoff.toISOString().slice(0, 10);
  const out: FuelReminder[] = [];
  for (const l of loads) {
    if (l.sample || (driver && l.driver !== driver)) continue;
    if (l.status !== 'Delivered' && l.status !== 'In transit') continue;
    const when = deliveryDate(l);
    if (l.status === 'Delivered' && (!when || when < recent)) continue;
    const p = packetProgress(l, fuel);
    const gaps =
      l.status === 'Delivered'
        ? p.missingRequired
        : p.missingRequired.filter((t) => !t.startsWith('Delivery'));
    if (!gaps.length) continue;
    out.push({
      kind: 'packet',
      title: `${l.order}: ${gaps.join(', ').toLowerCase()} missing`,
      detail:
        l.status === 'Delivered'
          ? `Delivered ${when} with ${p.attached} of ${p.total} documents in the packet. Add the ${gaps.length === 1 ? 'document' : 'documents'} before settlement.`
          : `On the road with ${p.attached} of ${p.total} documents so far. Photograph pickup paperwork before it gets lost.`,
      loadId: l.id,
    });
  }
  return out;
}
/** Tow configurations used on driveaway loads. */
export const towTypes = ['N/A', 'Tow-behind', 'Decked', 'Saddle mount'];
/** Google Maps directions link that opens the phone's maps app. */
export function directionsUrl(l: Load, which: 'origin' | 'destination') {
  const name = which === 'origin' ? l.originName : l.destName;
  const address = which === 'origin' ? l.originAddress : l.destAddress;
  const city = which === 'origin' ? l.origin : l.destination;
  const q = [name, address, city].filter(Boolean).join(', ');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}
