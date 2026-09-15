import { defaults, returnModes, type Load, type Preferences } from './model';
import { hoursRuleKeys } from './hos';
import { jurisdictionCodes, parseStateMiles, type FuelEntry } from './ifta';
import {
  packetStatuses,
  packetTypes,
  towTypes,
  type PacketItem,
} from './packet';
export class InputError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export function string(v: unknown, name: string, max = 100) {
  if (typeof v !== 'string' || !v.trim() || v.length > max)
    throw new InputError(`${name} is required (maximum ${max} characters).`);
  return v.trim();
}
export function number(
  v: unknown,
  name: string,
  min: number,
  max: number,
  integer = false,
) {
  if (
    typeof v !== 'number' ||
    !Number.isFinite(v) ||
    v < min ||
    v > max ||
    (integer && !Number.isInteger(v))
  )
    throw new InputError(
      `${name} must be ${integer ? 'a whole number ' : ''}between ${min} and ${max}.`,
    );
  return v;
}
function bool(v: unknown, name: string) {
  if (typeof v !== 'boolean')
    throw new InputError(`${name} must be true or false.`);
  return v;
}
function option(v: unknown, name: string, options: string[]) {
  const s = string(v, name);
  if (!options.includes(s)) throw new InputError(`Invalid ${name}.`);
  return s;
}
export function validateLoad(v: unknown): Load {
  if (!v || typeof v !== 'object') throw new InputError('Provide a load.');
  const x = v as Record<string, unknown>;
  const date = string(x.date, 'Date', 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw new InputError('Use a valid date in YYYY-MM-DD format.');
  const l: Load = {
    id: string(x.id, 'Load ID', 100),
    order: string(x.order, 'Order number', 80),
    ref: text(x.ref, 80),
    origin: string(x.origin, 'Origin', 100),
    destination: string(x.destination, 'Destination', 100),
    originName: text(x.originName, 120),
    originAddress: text(x.originAddress, 200),
    destName: text(x.destName, 120),
    destAddress: text(x.destAddress, 200),
    units: number(x.units ?? 1, 'Units', 1, 50, true),
    towType: option(
      x.towType ?? (x.towable === true ? 'Tow-behind' : 'N/A'),
      'Tow type',
      towTypes,
    ),
    originLat: number(x.originLat, 'Origin latitude', -90, 90),
    originLng: number(x.originLng, 'Origin longitude', -180, 180),
    destLat: number(x.destLat, 'Destination latitude', -90, 90),
    destLng: number(x.destLng, 'Destination longitude', -180, 180),
    miles: number(x.miles, 'Loaded miles', 1, 10000),
    pay: number(x.pay, 'Load pay', 0.01, 1000000),
    date,
    days: number(x.days, 'Trip days', 1, 7, true),
    deadhead: number(x.deadhead, 'Deadhead miles', 0, 10000),
    fuelType: option(x.fuelType, 'Fuel type', ['Diesel', 'Unleaded']),
    mpg: number(x.mpg, 'Vehicle MPG', 1, 100),
    hotelNights: number(x.hotelNights, 'Hotel nights', 0, 30, true),
    tolls: number(x.tolls, 'Tolls', 0, 100000),
    returnCost: number(x.returnCost, 'Return transportation', 0, 100000),
    returnMode: option(
      x.returnMode === undefined || x.returnMode === ''
        ? 'Unspecified'
        : x.returnMode,
      'Way home',
      [...returnModes],
    ),
    returnHub:
      typeof x.returnHub === 'string' ? x.returnHub.trim().slice(0, 100) : '',
    stateMiles: stateMilesText(x.stateMiles),
    other: number(x.other, 'Other expenses', 0, 100000),
    cdl: bool(x.cdl, 'CDL'),
    towable: bool(x.towable, 'Towable'),
    status: option(x.status, 'Status', [
      'Available',
      'Assigned',
      'In transit',
      'Delivered',
      'Cancelled',
    ]),
    driver: typeof x.driver === 'string' ? x.driver.slice(0, 254) : '',
    notes: typeof x.notes === 'string' ? x.notes.slice(0, 2000) : '',
    deliveredOn: isoDate(x.deliveredOn, 'Delivered on'),
    sample: x.sample === true,
  };
  l.towable = l.towable || l.towType !== 'N/A';
  if (x.packet !== undefined && x.packet !== null) l.packet = packet(x.packet);
  if (x.version !== undefined)
    l.version = number(x.version, 'Version', 1, 1e9, true);
  return l;
}
function text(v: unknown, max: number) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
function packet(v: unknown): PacketItem[] {
  if (!Array.isArray(v) || v.length > packetTypes.length)
    throw new InputError('The trip packet is not valid.');
  const known = new Set(packetTypes.map((t) => t.type));
  return v.map((raw) => {
    const x = (raw || {}) as Record<string, unknown>;
    const type = string(x.type, 'Document type', 40);
    if (!known.has(type)) throw new InputError(`Unknown document: ${type}.`);
    return {
      type,
      status: option(x.status ?? 'Missing', 'Document status', [
        ...packetStatuses,
      ]) as PacketItem['status'],
      amount: number(x.amount ?? 0, `${type} amount`, 0, 100000),
      date: isoDate(x.date, `${type} date`),
      note: text(x.note, 200),
      file: text(x.file, 300),
    };
  });
}
function stateMilesText(v: unknown) {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v !== 'string' || v.length > 300)
    throw new InputError(
      'Jurisdiction miles must be text up to 300 characters.',
    );
  if (parseStateMiles(v) === null)
    throw new InputError(
      'Write jurisdiction miles as state codes and miles, for example "GA 120, TN 130".',
    );
  return v.trim();
}
export function validateFuel(v: unknown): FuelEntry {
  if (!v || typeof v !== 'object') throw new InputError('Provide a fuel stop.');
  const x = v as Record<string, unknown>;
  const date = isoDate(x.date, 'Fuel date');
  if (!date) throw new InputError('Fuel date is required.');
  const f: FuelEntry = {
    id: string(x.id, 'Fuel stop ID', 100),
    date,
    jurisdiction: option(x.jurisdiction, 'Jurisdiction', jurisdictionCodes),
    fuelType: option(x.fuelType ?? 'Diesel', 'Fuel type', [
      'Diesel',
      'Unleaded',
    ]),
    gallons: number(x.gallons, 'Gallons', 0.1, 1000),
    total: number(x.total, 'Fuel total', 0, 100000),
    def: number(x.def ?? 0, 'DEF gallons', 0, 200),
    defTotal: number(x.defTotal ?? 0, 'DEF total', 0, 10000),
    odometer: number(x.odometer ?? 0, 'Odometer', 0, 10000000),
    loadId: typeof x.loadId === 'string' ? x.loadId.slice(0, 100) : '',
    driver: typeof x.driver === 'string' ? x.driver.slice(0, 254) : '',
    vendor: typeof x.vendor === 'string' ? x.vendor.trim().slice(0, 80) : '',
    receipt: x.receipt === true,
    notes: typeof x.notes === 'string' ? x.notes.slice(0, 1000) : '',
    sample: x.sample === true,
  };
  return f;
}
function isoDate(v: unknown, label: string): string {
  if (v === undefined || v === null || v === '') return '';
  if (
    typeof v !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    Number.isNaN(new Date(`${v}T00:00:00Z`).getTime())
  )
    throw new InputError(`${label} must be a valid date.`);
  return v;
}
export function validatePreferences(v: unknown): Preferences {
  if (!v || typeof v !== 'object') throw new InputError('Provide preferences.');
  const x = v as Record<string, unknown>;
  const p = { ...defaults };
  p.name = string(x.name, 'Display name', 80);
  p.home = string(x.home, 'Starting market', 100);
  p.company = string(x.company, 'Company', 80);
  p.cdl = bool(x.cdl, 'CDL');
  p.towable = bool(x.towable, 'Towable');
  p.alerts = bool(x.alerts, 'Alerts');
  const bounds: Record<string, [number, number, boolean?]> = {
    homeLat: [-90, 90],
    homeLng: [-180, 180],
    goal: [1, 1000000],
    days: [1, 7, true],
    weeklyBudget: [0, 1000000],
    maxExpense: [0, 100000],
    diesel: [0.1, 30],
    unleaded: [0.1, 30],
    mpg: [1, 100],
    hotel: [0, 5000],
    food: [0, 1000],
    minNetDay: [0, 100000],
    minNetMile: [0, 100],
    maxDeadhead: [0, 100],
    radius: [0, 500],
    minMiles: [1, 10000],
    maxMiles: [1, 10000],
  };
  for (const [k, [min, max, int]] of Object.entries(bounds))
    (p as unknown as Record<string, unknown>)[k] = number(
      x[k],
      k,
      min,
      max,
      int,
    );
  if (p.minMiles > p.maxMiles)
    throw new InputError('Minimum miles cannot exceed maximum miles.');
  p.returnMode = option(x.returnMode ?? 'Any', 'Preferred way home', [
    'Any',
    ...returnModes,
  ]);
  p.hoursRule = option(
    x.hoursRule ?? defaults.hoursRule,
    'Hours-of-service rule',
    hoursRuleKeys,
  );
  p.cycle = number(x.cycle ?? defaults.cycle, 'Cycle hours', 60, 70);
  if (p.cycle !== 60 && p.cycle !== 70)
    throw new InputError('Choose the 60-hour or 70-hour cycle.');
  p.avgMph = number(x.avgMph ?? defaults.avgMph, 'Average speed', 20, 75);
  const log = x.hoursLog === undefined ? defaults.hoursLog : x.hoursLog;
  if (!Array.isArray(log) || log.length !== 8)
    throw new InputError('Hours log must cover the last eight days.');
  p.hoursLog = log.map((h) => number(h, 'On-duty hours', 0, 24));
  p.hoursLogDate = isoDate(x.hoursLogDate, 'Hours log date');
  p.truck = string(x.truck ?? defaults.truck, 'Truck', 80);
  p.defRate = number(x.defRate ?? defaults.defRate, 'DEF rate', 0, 10);
  return p;
}
