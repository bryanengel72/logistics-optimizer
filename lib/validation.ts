import { defaults, type Load, type Preferences } from './model';
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
    origin: string(x.origin, 'Origin', 100),
    destination: string(x.destination, 'Destination', 100),
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
  if (x.version !== undefined)
    l.version = number(x.version, 'Version', 1, 1e9, true);
  return l;
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
  return p;
}
