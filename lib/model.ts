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
  other: number;
  cdl: boolean;
  towable: boolean;
  status: string;
  driver: string;
  notes: string;
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
};
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
export function seedLoads(): Load[] {
  return lanes.map((r, i) => {
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
      returnCost: 85,
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
          5 * Math.max(0, 1 - l.returnCost / 300),
      ),
    ),
  );
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
  };
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
