import { ruleFor, tripSchedule } from './hos';
export type Load = {
  id: string;
  order: string;
  origin: string;
  destination: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  miles: number;
  pay: number;
  date: string;
  days: number;
  deadhead: number;
  fuelType: string;
  mpg: number;
  hotelNights: number;
  tolls: number;
  returnCost: number;
  /** How the driver gets home or to the next pickup after delivery. */
  returnMode: string;
  /** Airport, bus terminal, or rail station used for the trip home. */
  returnHub: string;
  /** Trip-sheet miles by jurisdiction for IFTA, e.g. "GA 120, TN 130". */
  stateMiles: string;
  other: number;
  cdl: boolean;
  towable: boolean;
  status: string;
  driver: string;
  notes: string;
  deliveredOn?: string;
  sample?: boolean;
  version?: number;
};
export type Preferences = {
  name: string;
  company: string;
  home: string;
  homeLat: number;
  homeLng: number;
  cdl: boolean;
  towable: boolean;
  goal: number;
  days: number;
  weeklyBudget: number;
  maxExpense: number;
  diesel: number;
  unleaded: number;
  mpg: number;
  hotel: number;
  food: number;
  minNetDay: number;
  minNetMile: number;
  maxDeadhead: number;
  radius: number;
  minMiles: number;
  maxMiles: number;
  alerts: boolean;
  /** Preferred way home after a delivery, or "Any". */
  returnMode: string;
  /** Hours-of-service rule set key from lib/hos. */
  hoursRule: string;
  /** On-duty cycle: 60 hours / 7 days or 70 hours / 8 days. */
  cycle: number;
  /** Assumed average speed for converting miles into driving hours. */
  avgMph: number;
  /** On-duty hours for the last eight days, oldest first, today last. */
  hoursLog: number[];
  /** Date the hours log was last saved, so it can be re-aligned to today. */
  hoursLogDate: string;
  /** Truck preset used for the DEF estimate. */
  truck: string;
  /** DEF dosing rate as a percentage of diesel gallons. */
  defRate: number;
};
export const defaults: Preferences = {
  name: 'Driver',
  company: 'My driveaway team',
  home: 'Atlanta, GA',
  homeLat: 33.749,
  homeLng: -84.388,
  cdl: true,
  towable: true,
  goal: 3000,
  days: 4,
  weeklyBudget: 1400,
  maxExpense: 650,
  diesel: 3.65,
  unleaded: 3.15,
  mpg: 14,
  hotel: 85,
  food: 35,
  minNetDay: 500,
  minNetMile: 0.8,
  maxDeadhead: 15,
  radius: 100,
  minMiles: 100,
  maxMiles: 1000,
  alerts: true,
  returnMode: 'Any',
  hoursRule: 'property',
  cycle: 70,
  avgMph: 50,
  hoursLog: [0, 0, 0, 0, 0, 0, 0, 0],
  hoursLogDate: '',
  truck: 'Class 8 tractor (Cummins X15, Detroit DD15, PACCAR MX-13)',
  defRate: 3,
};
/** Ways home after a delivery. "Next load nearby" means no return trip. */
export const returnModes = [
  'Unspecified',
  'Flight',
  'Train',
  'Bus',
  'Rental car',
  'Rideshare',
  'Team pickup',
  'Next load nearby',
] as const;
/** Starting estimates for a one-way trip home, editable per load. */
export const returnDefaults: Record<string, number> = {
  Unspecified: 0,
  Flight: 240,
  Train: 95,
  Bus: 65,
  'Rental car': 150,
  Rideshare: 45,
  'Team pickup': 0,
  'Next load nearby': 0,
};
/** Primary commercial airport for each suggested market. */
export const airports: Record<string, string> = {
  'Atlanta, GA': 'ATL',
  'Nashville, TN': 'BNA',
  'Dallas, TX': 'DFW',
  'Chicago, IL': 'ORD',
  'Charlotte, NC': 'CLT',
  'Memphis, TN': 'MEM',
  'Columbus, OH': 'CMH',
  'Indianapolis, IN': 'IND',
  'Louisville, KY': 'SDF',
  'Houston, TX': 'IAH',
  'Birmingham, AL': 'BHM',
  'Jacksonville, FL': 'JAX',
  'St. Louis, MO': 'STL',
  'Knoxville, TN': 'TYS',
  'Detroit, MI': 'DTW',
};
/** Suggested hub text for a return mode from a destination market. */
export function suggestHub(mode: string, destination: string) {
  if (mode === 'Flight') return airports[destination] || '';
  const city = destination.split(',')[0];
  if (mode === 'Train') return city ? `${city} Amtrak` : '';
  if (mode === 'Bus') return city ? `${city} Greyhound` : '';
  return '';
}
export const cities: Record<string, [number, number]> = {
  'Atlanta, GA': [33.749, -84.388],
  'Nashville, TN': [36.163, -86.782],
  'Dallas, TX': [32.777, -96.797],
  'Chicago, IL': [41.878, -87.63],
  'Charlotte, NC': [35.227, -80.843],
  'Memphis, TN': [35.15, -90.049],
  'Columbus, OH': [39.962, -82.999],
  'Indianapolis, IN': [39.768, -86.158],
  'Louisville, KY': [38.253, -85.758],
  'Houston, TX': [29.761, -95.37],
  'Birmingham, AL': [33.52, -86.802],
  'Jacksonville, FL': [30.332, -81.656],
  'St. Louis, MO': [38.627, -90.199],
  'Knoxville, TN': [35.961, -83.921],
  'Detroit, MI': [42.331, -83.046],
};
const lanes = [
  ['Atlanta, GA', 'Nashville, TN', 250, 1175, 1, 12, 15],
  ['Nashville, TN', 'Memphis, TN', 212, 1025, 1, 8, 10],
  ['Memphis, TN', 'Birmingham, AL', 240, 1120, 1, 10, 18],
  ['Birmingham, AL', 'Atlanta, GA', 147, 875, 1, 6, 5],
  ['Atlanta, GA', 'Charlotte, NC', 245, 890, 1, 22, 12],
  ['Charlotte, NC', 'Columbus, OH', 425, 1160, 1, 18, 30],
  ['Columbus, OH', 'Chicago, IL', 358, 990, 1, 12, 45],
  ['Dallas, TX', 'Houston, TX', 239, 820, 1, 15, 18],
  ['Atlanta, GA', 'Dallas, TX', 782, 1650, 2, 20, 30],
  ['Chicago, IL', 'Atlanta, GA', 716, 1590, 2, 25, 40],
  ['Memphis, TN', 'St. Louis, MO', 284, 950, 1, 12, 20],
  ['Atlanta, GA', 'Jacksonville, FL', 346, 1015, 1, 15, 16],
] as const;
const history = [
  ['Atlanta, GA', 'Nashville, TN', 250, 1150, 1, 10, 15, 10, 8],
  ['Nashville, TN', 'Louisville, KY', 175, 790, 1, 8, 6, 9, 21],
  ['Atlanta, GA', 'Charlotte, NC', 245, 880, 1, 20, 12, 8, 4],
  ['Charlotte, NC', 'Knoxville, TN', 230, 860, 1, 14, 9, 8, 19],
  ['Knoxville, TN', 'Atlanta, GA', 215, 815, 1, 9, 7, 8, 27],
  ['Atlanta, GA', 'Jacksonville, FL', 346, 1000, 1, 15, 16, 6, 12],
  ['Memphis, TN', 'St. Louis, MO', 284, 940, 1, 12, 20, 4, 3],
  ['St. Louis, MO', 'Indianapolis, IN', 243, 870, 1, 10, 14, 4, 16],
  ['Atlanta, GA', 'Dallas, TX', 782, 1625, 2, 22, 30, 4, 29],
  ['Columbus, OH', 'Detroit, MI', 200, 800, 1, 11, 12, 2, 7],
  ['Atlanta, GA', 'Birmingham, AL', 147, 860, 1, 6, 5, 1, 11],
  ['Birmingham, AL', 'Memphis, TN', 240, 1100, 1, 10, 18, 1, 25],
] as const;
function monthsAgo(n: number, day: number, from = new Date()): string {
  const d = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - n, 1),
  );
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
/** Date a load was completed, or null when it has not been delivered. */
export function deliveryDate(l: Load): string | null {
  if (l.status !== 'Delivered') return null;
  if (l.deliveredOn) return l.deliveredOn;
  const d = new Date(`${l.date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + Math.max(0, l.days - 1));
  return d.toISOString().slice(0, 10);
}
/** Keeps the delivery date consistent with the status before saving. */
export function stampDelivery(l: Load, today: string): Load {
  if (l.status !== 'Delivered') return { ...l, deliveredOn: '' };
  return { ...l, deliveredOn: l.deliveredOn || today };
}
export type MonthDrives = {
  key: string;
  label: string;
  year: number;
  month: number;
  drives: number;
  miles: number;
  pay: number;
};
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
/** Delivered loads bucketed by month, oldest first, ending with the current month. */
export function monthlyDrives(
  loads: Load[],
  driver = '',
  months = 12,
  today = new Date(),
): MonthDrives[] {
  const out: MonthDrives[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1),
    );
    out.push({
      key: d.toISOString().slice(0, 7),
      label: MONTHS[d.getUTCMonth()],
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      drives: 0,
      miles: 0,
      pay: 0,
    });
  }
  const byKey = new Map(out.map((m) => [m.key, m]));
  for (const l of loads) {
    if (driver && l.driver !== driver) continue;
    const when = deliveryDate(l);
    const m = when && byKey.get(when.slice(0, 7));
    if (!m) continue;
    m.drives += 1;
    m.miles += l.miles;
    m.pay += l.pay;
  }
  return out;
}
/** Quantizes a month's drive count into 0–4 against the busiest month. */
export function driveLevel(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4)));
}
const seedReturn = ['Bus', 'Train', 'Rideshare', 'Team pickup'];
function seedStateMiles(from: string, to: string, miles: number) {
  const a = from.slice(-2),
    b = to.slice(-2);
  if (a === b) return `${a} ${miles}`;
  const first = Math.round(miles * 0.45);
  return `${a} ${first}, ${b} ${miles - first}`;
}
export function seedLoads(): Load[] {
  const delivered: Load[] = history.map((r, i) => {
    const a = cities[r[0]],
      b = cities[r[1]];
    return {
      id: `sample-${lanes.length + i + 1}`,
      order: `SEC-${2501 + i}`,
      origin: r[0],
      destination: r[1],
      originLat: a[0],
      originLng: a[1],
      destLat: b[0],
      destLng: b[1],
      miles: r[2],
      pay: r[3],
      date: monthsAgo(r[7], Math.max(1, r[8] - r[4] + 1)),
      days: r[4],
      deadhead: r[5],
      fuelType: i % 3 === 0 ? 'Unleaded' : 'Diesel',
      mpg: i % 3 === 0 ? 16 : 14,
      hotelNights: r[4] - 1,
      tolls: r[6],
      returnCost: 85,
      returnMode: seedReturn[i % seedReturn.length],
      returnHub: suggestHub(seedReturn[i % seedReturn.length], r[1]),
      stateMiles: i % 3 === 0 ? seedStateMiles(r[0], r[1], r[2]) : '',
      other: 15,
      cdl: i % 2 === 0,
      towable: i % 2 === 1,
      status: 'Delivered',
      driver: '',
      notes: 'Illustrative completed drive from earlier this year.',
      deliveredOn: monthsAgo(r[7], r[8]),
      sample: true,
    };
  });
  const available = lanes.map((r, i): Load => {
    const a = cities[r[0]],
      b = cities[r[1]];
    return {
      id: `sample-${i + 1}`,
      order: `SEC-${2601 + i}`,
      origin: r[0],
      destination: r[1],
      originLat: a[0],
      originLng: a[1],
      destLat: b[0],
      destLng: b[1],
      miles: r[2],
      pay: r[3],
      date: '2026-09-07',
      days: r[4],
      deadhead: r[5],
      fuelType: i % 4 === 0 ? 'Unleaded' : 'Diesel',
      mpg: i % 4 === 0 ? 16 : 14,
      hotelNights: r[4] - 1,
      tolls: r[6],
      returnCost: r[4] > 1 ? returnDefaults.Flight : 85,
      returnMode: r[4] > 1 ? 'Flight' : seedReturn[i % seedReturn.length],
      returnHub: suggestHub(
        r[4] > 1 ? 'Flight' : seedReturn[i % seedReturn.length],
        r[1],
      ),
      stateMiles: '',
      other: 15,
      cdl: i % 3 !== 0,
      towable: i % 2 === 0,
      status: 'Available',
      driver: '',
      notes:
        'Illustrative sample load. Rates and availability are not a live feed.',
      sample: true,
    };
  });
  return [...available, ...delivered];
}
export function money(n: number, decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(n);
}
export function costs(l: Load, p: Preferences) {
  const fuel =
    ((l.miles + l.deadhead) / l.mpg) *
    (l.fuelType === 'Diesel' ? p.diesel : p.unleaded);
  const hotel = l.hotelNights * p.hotel,
    food = l.days * p.food;
  const expenses = fuel + hotel + food + l.tolls + l.returnCost + l.other;
  const net = l.pay - expenses;
  const netDay = net / l.days,
    netMile = net / (l.miles + l.deadhead);
  const deadheadPct = (100 * l.deadhead) / (l.miles + l.deadhead);
  const qualified =
    (!l.cdl || p.cdl) &&
    (!l.towable || p.towable) &&
    l.miles >= p.minMiles &&
    l.miles <= p.maxMiles;
  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        30 * Math.min(1, net / 1000) +
          25 * Math.min(1, netDay / Math.max(1, p.goal / p.days)) +
          15 * Math.max(0, 1 - expenses / l.pay) +
          10 * Math.min(1, l.pay / l.miles / 3) +
          10 * Math.max(0, 1 - deadheadPct / Math.max(1, p.maxDeadhead)) +
          5 * (l.destination === p.home ? 1 : 0.5) +
          5 * Math.max(0, 1 - l.returnCost / 300) * returnFit(l, p),
      ),
    ),
  );
  const rule = ruleFor(l, p);
  const trip = tripSchedule(l.miles + l.deadhead, rule, p.avgMph);
  const reason = !qualified
    ? 'Outside profile'
    : expenses > p.maxExpense
      ? 'Over budget'
      : deadheadPct > p.maxDeadhead
        ? 'High deadhead'
        : netDay < p.minNetDay || netMile < p.minNetMile
          ? 'Low net'
          : score >= 80
            ? 'Top pick'
            : 'Good fit';
  return {
    fuel,
    hotel,
    food,
    expenses,
    net,
    netDay,
    netMile,
    deadheadPct,
    score,
    qualified,
    reason,
    drivingHours: trip.hours,
    minDays: trip.days,
    breaks: trip.breaks,
    hoursRule: rule,
    hoursOk: l.days >= trip.days,
  };
}
/** 1 when the load's way home matches the driver's preference, less otherwise. */
export function returnFit(
  l: Pick<Load, 'returnMode'>,
  p: Pick<Preferences, 'returnMode'>,
) {
  if (!p.returnMode || p.returnMode === 'Any') return 1;
  const mode = l.returnMode || 'Unspecified';
  if (mode === p.returnMode) return 1;
  if (mode === 'Unspecified' || mode === 'Next load nearby') return 0.7;
  return 0.4;
}
export function distance(a: number, b: number, c: number, d: number) {
  const rad = Math.PI / 180;
  const v =
    Math.sin(((c - a) * rad) / 2) ** 2 +
    Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(1 - v));
}
export type Plan = {
  loads: Load[];
  gross: number;
  expenses: number;
  net: number;
  days: number;
  miles: number;
  deadhead: number;
  reposition: number;
  overnight: number;
  meals: number;
  returnCost: number;
  goalMet: boolean;
};
export function optimize(
  loads: Load[],
  p: Preferences,
  limit = p.days,
  strategy = 'Maximum net',
): Plan {
  let best: Plan = {
    loads: [],
    gross: 0,
    expenses: 0,
    net: 0,
    days: 0,
    miles: 0,
    deadhead: 0,
    reposition: 0,
    overnight: 0,
    meals: 0,
    returnCost: 0,
    goalMet: false,
  };
  let bestScore = 0;
  let explored = 0;
  const candidates = loads
    .filter((l) => l.status === 'Available')
    .map((l) => ({ l, c: costs(l, p) }))
    .filter(
      ({ c }) =>
        c.qualified &&
        c.expenses <= p.maxExpense &&
        c.netDay >= p.minNetDay &&
        c.netMile >= p.minNetMile,
    )
    .sort((a, b) => b.c.netDay - a.c.netDay);
  function walk(
    chain: Load[],
    lat: number,
    lng: number,
    usedDays: number,
    baseExpense: number,
    gross: number,
    miles: number,
    deadhead: number,
    reposition: number,
    lastDate: string,
  ) {
    if (++explored > 20000) return;
    if (chain.length) {
      const last = chain[chain.length - 1];
      const backHome = distance(lat, lng, p.homeLat, p.homeLng) < 25;
      const ret = backHome ? 0 : last.returnCost;
      const nights = Math.max(
        0,
        Math.ceil(usedDays) - 1,
        chain.reduce((s, l) => s + l.hotelNights, 0),
      );
      const meals = usedDays * p.food;
      const expense = baseExpense + nights * p.hotel + meals + ret;
      const net = gross - expense;
      const met = net >= p.goal;
      let score = net;
      if (strategy === 'Lowest cost') score = met ? 1e7 - expense : net;
      if (strategy === 'Best balance') score = net / (0.65 + 0.35 * usedDays);
      if (expense <= p.weeklyBudget && score > bestScore) {
        bestScore = score;
        best = {
          loads: [...chain],
          gross,
          expenses: expense,
          net,
          days: usedDays,
          miles,
          deadhead,
          reposition,
          overnight: nights * p.hotel,
          meals,
          returnCost: ret,
          goalMet: met,
        };
      }
    }
    if (chain.length >= 7) return;
    for (const { l, c } of candidates) {
      if (explored >= 20000) return;
      if (
        l.status === 'Delivered' ||
        l.status === 'Cancelled' ||
        chain.some((x) => x.id === l.id)
      )
        continue;
      if (
        !c.qualified ||
        c.expenses > p.maxExpense ||
        c.netDay < p.minNetDay ||
        c.netMile < p.minNetMile
      )
        continue;
      const gap = distance(lat, lng, l.originLat, l.originLng);
      if (gap > p.radius) continue;
      const positioning =
        gap < 10 ? l.deadhead : Math.max(l.deadhead, Math.round(gap * 1.2));
      if ((positioning / (l.miles + positioning)) * 100 > p.maxDeadhead)
        continue;
      const earliest = lastDate
        ? new Date(lastDate).getTime()
        : new Date(l.date).getTime();
      const wait = Math.max(
        0,
        (new Date(l.date).getTime() - earliest) / 86400000,
      );
      const d =
        usedDays + l.days + Math.max(0, positioning - l.deadhead) / 500 + wait;
      if (d > limit) continue;
      const repositionCost =
        (positioning / l.mpg) *
        (l.fuelType === 'Diesel' ? p.diesel : p.unleaded);
      const ex =
        (l.miles / l.mpg) * (l.fuelType === 'Diesel' ? p.diesel : p.unleaded) +
        repositionCost +
        l.tolls +
        l.other;
      const additionalFuel =
        (Math.max(0, positioning - l.deadhead) / l.mpg) *
        (l.fuelType === 'Diesel' ? p.diesel : p.unleaded);
      if (
        c.expenses + additionalFuel + wait * (p.food + p.hotel) >
        p.maxExpense
      )
        continue;
      const nextDate = new Date(
        Math.max(earliest, new Date(l.date).getTime()) + l.days * 86400000,
      )
        .toISOString()
        .slice(0, 10);
      walk(
        [...chain, l],
        l.destLat,
        l.destLng,
        d,
        baseExpense + ex,
        gross + l.pay,
        miles + l.miles,
        deadhead + positioning,
        reposition + repositionCost,
        nextDate,
      );
    }
  }
  walk([], p.homeLat, p.homeLng, 0, 0, 0, 0, 0, 0, '');
  return best;
}
