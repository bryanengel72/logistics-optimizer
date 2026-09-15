import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaults,
  seedLoads,
  costs,
  optimize,
  distance,
  deliveryDate,
  stampDelivery,
  monthlyDrives,
  driveLevel,
} from '../work/model/model.js';
import { validateLoad, validatePreferences } from '../work/model/validation.js';
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.00001, `${a} ≠ ${b}`);
test('standalone profit includes loaded and deadhead fuel, meals, hotel, tolls and return', () => {
  const l = {
    ...seedLoads()[0],
    miles: 400,
    deadhead: 20,
    mpg: 10,
    days: 2,
    hotelNights: 1,
    pay: 1500,
    returnCost: 125,
    tolls: 30,
    other: 20,
    fuelType: 'Diesel',
  };
  const p = { ...defaults, diesel: 4, hotel: 100, food: 40 };
  const c = costs(l, p);
  near(c.fuel, 168);
  near(c.expenses, 523);
  near(c.net, 977);
  near(c.netDay, 488.5);
  near(c.netMile, 977 / 420);
});
test('four-day connected loop reaches the goal without double-counting return trips', () => {
  const plan = optimize(seedLoads().slice(0, 4), defaults, 4);
  assert.equal(plan.loads.length, 4);
  assert.equal(plan.returnCost, 0);
  assert.equal(plan.overnight, 255);
  assert.equal(plan.meals, 140);
  near(plan.net, 3477.99375);
  assert.equal(plan.goalMet, true);
  near(plan.net + plan.expenses, plan.gross);
});
test('every 1–7 day plan respects duration, weekly budget, connectivity and unique loads', () => {
  for (let days = 1; days <= 7; days++) {
    const plan = optimize(seedLoads(), defaults, days);
    assert.ok(plan.days <= days);
    assert.ok(plan.expenses <= defaults.weeklyBudget);
    assert.equal(new Set(plan.loads.map((l) => l.id)).size, plan.loads.length);
    let lat = defaults.homeLat,
      lng = defaults.homeLng;
    for (const l of plan.loads) {
      assert.ok(
        distance(lat, lng, l.originLat, l.originLng) <= defaults.radius,
      );
      lat = l.destLat;
      lng = l.destLng;
    }
  }
});
test('unavailable and ineligible loads are excluded', () => {
  assert.equal(
    optimize(
      seedLoads().map((l) => ({ ...l, status: 'In transit' })),
      defaults,
    ).loads.length,
    0,
  );
  const p = { ...defaults, cdl: false, towable: false };
  assert.ok(optimize(seedLoads(), p).loads.every((l) => !l.cdl && !l.towable));
  assert.equal(
    optimize(seedLoads(), { ...defaults, weeklyBudget: 1 }).loads.length,
    0,
  );
});
test('waiting days add meals and lodging and can make a chain infeasible', () => {
  const ls = seedLoads().slice(0, 2);
  ls[1] = { ...ls[1], date: '2026-09-10' };
  const p = { ...defaults, maxExpense: 1000 };
  assert.equal(optimize(ls, p, 2).loads.length, 1);
  const r = optimize(ls, p, 4);
  assert.equal(r.loads.length, 2);
  assert.equal(r.days, 4);
  assert.equal(r.meals, 4 * p.food);
  assert.equal(r.overnight, 3 * p.hotel);
});
test('explicit hotel nights are retained in plan estimates', () => {
  const l = { ...seedLoads()[0], hotelNights: 2 };
  const p = { ...defaults, maxExpense: 1000 };
  const plan = optimize([l], p, 1);
  assert.equal(plan.overnight, 170);
});
test('lowest-cost strategy reaches the goal when a feasible combination exists', () => {
  const plan = optimize(seedLoads(), defaults, 7, 'Lowest cost');
  assert.ok(plan.goalMet);
  assert.ok(plan.expenses <= optimize(seedLoads(), defaults, 7).expenses);
});
test('negative-profit trips never become recommendations', () => {
  assert.equal(
    optimize(
      seedLoads().map((l) => ({ ...l, pay: 1 })),
      { ...defaults, minNetDay: 0, minNetMile: 0 },
    ).loads.length,
    0,
  );
});
test('server validation rejects invalid finances, dates, coordinates and settings', () => {
  const l = seedLoads()[0];
  for (const patch of [
    { pay: -1 },
    { mpg: 0 },
    { days: 8 },
    { date: '2026-02-30' },
    { originLat: 100 },
    { tolls: Infinity },
    { cdl: 'yes' },
  ])
    assert.throws(() => validateLoad({ ...l, ...patch }));
  assert.throws(() =>
    validatePreferences({ ...defaults, minMiles: 900, maxMiles: 100 }),
  );
  assert.throws(() => validatePreferences({ ...defaults, days: 0 }));
  assert.equal(validateLoad(l).order, l.order);
  assert.deepEqual(validatePreferences(defaults), defaults);
});

test('delivery date uses the recorded date and falls back to availability plus trip days', () => {
  const l = {
    ...seedLoads()[0],
    status: 'Delivered',
    date: '2026-03-30',
    days: 3,
  };
  assert.equal(deliveryDate(l), '2026-04-01');
  assert.equal(deliveryDate({ ...l, deliveredOn: '2026-04-05' }), '2026-04-05');
  assert.equal(deliveryDate({ ...l, status: 'In transit' }), null);
});
test('stamping fills in the delivery date only for delivered loads', () => {
  const l = seedLoads()[0];
  assert.equal(
    stampDelivery({ ...l, status: 'Delivered' }, '2026-09-12').deliveredOn,
    '2026-09-12',
  );
  assert.equal(
    stampDelivery(
      { ...l, status: 'Delivered', deliveredOn: '2026-08-01' },
      '2026-09-12',
    ).deliveredOn,
    '2026-08-01',
  );
  assert.equal(
    stampDelivery(
      { ...l, status: 'Available', deliveredOn: '2026-08-01' },
      '2026-09-12',
    ).deliveredOn,
    '',
  );
});
test('monthly drives bucket delivered loads for the last twelve months, oldest first', () => {
  const base = seedLoads()[0];
  const loads = [
    {
      ...base,
      id: 'a',
      status: 'Delivered',
      deliveredOn: '2026-09-02',
      driver: 'me@x.com',
      miles: 100,
      pay: 500,
    },
    {
      ...base,
      id: 'b',
      status: 'Delivered',
      deliveredOn: '2026-09-20',
      driver: 'me@x.com',
      miles: 200,
      pay: 700,
    },
    {
      ...base,
      id: 'c',
      status: 'Delivered',
      deliveredOn: '2025-10-15',
      driver: 'you@x.com',
      miles: 50,
      pay: 100,
    },
    {
      ...base,
      id: 'd',
      status: 'Delivered',
      deliveredOn: '2025-09-15',
      driver: 'me@x.com',
    },
    { ...base, id: 'e', status: 'Available', driver: 'me@x.com' },
  ];
  const today = new Date('2026-09-12T12:00:00Z');
  const all = monthlyDrives(loads, '', 12, today);
  assert.equal(all.length, 12);
  assert.equal(all[0].key, '2025-10');
  assert.equal(all[11].key, '2026-09');
  assert.equal(all[11].drives, 2);
  assert.equal(all[11].miles, 300);
  assert.equal(all[11].pay, 1200);
  assert.equal(all[0].drives, 1);
  assert.equal(
    all.reduce((s, m) => s + m.drives, 0),
    3,
  );
  const mine = monthlyDrives(loads, 'me@x.com', 12, today);
  assert.equal(
    mine.reduce((s, m) => s + m.drives, 0),
    2,
  );
});
test('drive levels quantize against the busiest month', () => {
  assert.equal(driveLevel(0, 8), 0);
  assert.equal(driveLevel(1, 8), 1);
  assert.equal(driveLevel(4, 8), 2);
  assert.equal(driveLevel(5, 8), 3);
  assert.equal(driveLevel(8, 8), 4);
  assert.equal(driveLevel(1, 1), 4);
});
test('seed data includes delivered history spread across recent months', () => {
  const months = monthlyDrives(seedLoads());
  assert.ok(months.filter((m) => m.drives > 0).length >= 5);
  assert.equal(seedLoads().filter((l) => l.status === 'Delivered').length, 12);
});

import {
  hoursRules,
  ruleFor,
  tripSchedule,
  cycleStatus,
  planDrivingHours,
  shiftHoursLog,
} from '../work/model/hos.js';
import {
  stateOf,
  quarterOf,
  quarterRange,
  quarterDue,
  recentQuarters,
  parseStateMiles,
  loadJurisdictionMiles,
  iftaWorksheet,
  defNeeded,
  fuelReminders,
  seedFuel,
} from '../work/model/ifta.js';
import { validateFuel } from '../work/model/validation.js';
import { returnFit } from '../work/model/model.js';

test('trip schedule splits miles into legal driving days with required breaks', () => {
  const p = hoursRules.property;
  const one = tripSchedule(400, p, 50);
  assert.equal(one.days, 1);
  assert.equal(one.breaks, 0);
  near(one.hours, 8);
  const long = tripSchedule(1100, p, 50);
  assert.equal(long.days, 2);
  assert.equal(long.breaks, 2);
  near(long.lastDay, 11);
  const zero = tripSchedule(0, p, 50);
  assert.equal(zero.days, 1);
  const bus = tripSchedule(505, hoursRules.passenger, 50);
  assert.equal(bus.days, 2);
  assert.equal(bus.breaks, 0);
  const app = tripSchedule(600, hoursRules.rideshare, 50);
  assert.equal(app.days, 1);
});
test('CDL loads always use DOT property rules; others follow the driver setting', () => {
  assert.equal(
    ruleFor({ cdl: true }, { hoursRule: 'rideshare' }).key,
    'property',
  );
  assert.equal(
    ruleFor({ cdl: false }, { hoursRule: 'rideshare' }).key,
    'rideshare',
  );
  assert.equal(ruleFor({ cdl: false }, { hoursRule: 'bogus' }).key, 'property');
});
test('cycle status tracks the rolling 70/8 and 60/7 windows', () => {
  const log = [10, 10, 10, 10, 10, 10, 5, 3];
  const s70 = cycleStatus(log, hoursRules.property, 70);
  assert.equal(s70.days, 8);
  assert.equal(s70.used, 68);
  assert.equal(s70.remaining, 2);
  assert.equal(s70.availableToday, 2);
  assert.equal(s70.tomorrowGain, 10);
  assert.equal(s70.restartAdvised, false);
  const s60 = cycleStatus(log, hoursRules.property, 60);
  assert.equal(s60.days, 7);
  assert.equal(s60.used, 58);
  assert.equal(s60.remaining, 2);
  const spent = cycleStatus(
    [14, 14, 14, 14, 14, 0, 0, 0],
    hoursRules.property,
    70,
  );
  assert.equal(spent.remaining, 0);
  assert.equal(spent.availableToday, 0);
  assert.equal(spent.restartAdvised, false);
  const stuck = cycleStatus(
    [0, 0, 0, 14, 14, 14, 14, 14],
    hoursRules.property,
    70,
  );
  assert.equal(stuck.remaining, 0);
  assert.equal(stuck.restartAdvised, true);
  const app = cycleStatus(
    [14, 14, 14, 14, 14, 14, 14, 4],
    hoursRules.rideshare,
    70,
  );
  assert.equal(app.remaining, Infinity);
  assert.equal(app.availableToday, 8);
  near(
    planDrivingHours(
      [
        { miles: 200, deadhead: 50 },
        { miles: 250, deadhead: 0 },
      ],
      50,
    ),
    10,
  );
});
test('a saved hours log is realigned to today', () => {
  const log = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual(shiftHoursLog(log, '2026-09-15', '2026-09-15'), log);
  assert.deepEqual(
    shiftHoursLog(log, '2026-09-13', '2026-09-15'),
    [3, 4, 5, 6, 7, 8, 0, 0],
  );
  assert.deepEqual(
    shiftHoursLog(log, '2026-09-01', '2026-09-15'),
    [0, 0, 0, 0, 0, 0, 0, 0],
  );
  assert.deepEqual(
    shiftHoursLog(undefined, '', '2026-09-15'),
    [0, 0, 0, 0, 0, 0, 0, 0],
  );
  assert.deepEqual(shiftHoursLog(log, '', '2026-09-15'), log);
});
test('costs report driving hours and whether the entered trip days are legal', () => {
  const l = {
    ...seedLoads()[0],
    miles: 1000,
    deadhead: 50,
    days: 1,
    cdl: true,
  };
  const c = costs(l, defaults);
  near(c.drivingHours, 21);
  assert.equal(c.minDays, 2);
  assert.equal(c.hoursOk, false);
  assert.equal(costs({ ...l, days: 2 }, defaults).hoursOk, true);
  assert.equal(c.hoursRule.key, 'property');
});
test('preferred way home nudges the score without changing eligibility', () => {
  assert.equal(returnFit({ returnMode: 'Bus' }, { returnMode: 'Any' }), 1);
  assert.equal(
    returnFit({ returnMode: 'Flight' }, { returnMode: 'Flight' }),
    1,
  );
  assert.equal(
    returnFit({ returnMode: 'Unspecified' }, { returnMode: 'Flight' }),
    0.7,
  );
  assert.equal(returnFit({ returnMode: 'Bus' }, { returnMode: 'Flight' }), 0.4);
  const l = { ...seedLoads()[0], returnMode: 'Bus', returnCost: 0 };
  const fly = { ...defaults, returnMode: 'Flight' };
  assert.ok(costs(l, fly).score < costs(l, defaults).score);
  assert.equal(costs(l, fly).qualified, costs(l, defaults).qualified);
  assert.equal(costs(l, fly).net, costs(l, defaults).net);
});
test('quarters, jurisdictions and trip-sheet miles parse correctly', () => {
  assert.equal(stateOf('Atlanta, GA'), 'GA');
  assert.equal(stateOf('Nowhere'), '');
  assert.equal(quarterOf('2026-08-14'), '2026-Q3');
  assert.deepEqual(quarterRange('2026-Q1'), ['2026-01-01', '2026-03-31']);
  assert.deepEqual(quarterRange('2026-Q4'), ['2026-10-01', '2026-12-31']);
  assert.equal(quarterDue('2026-Q3'), '2026-10-31');
  assert.equal(quarterDue('2026-Q4'), '2027-01-31');
  assert.deepEqual(recentQuarters('2026-02-10', 3), [
    '2026-Q1',
    '2025-Q4',
    '2025-Q3',
  ]);
  assert.deepEqual(parseStateMiles('GA 120, TN 130'), { GA: 120, TN: 130 });
  assert.deepEqual(parseStateMiles('ga:100; GA=50'), { GA: 150 });
  assert.deepEqual(parseStateMiles(''), {});
  assert.equal(parseStateMiles('Georgia 120'), null);
  const est = loadJurisdictionMiles({
    ...seedLoads()[0],
    origin: 'Atlanta, GA',
    destination: 'Nashville, TN',
    miles: 250,
    deadhead: 12,
    stateMiles: '',
  });
  assert.equal(est.estimated, true);
  near(est.miles.GA, 137);
  near(est.miles.TN, 125);
  const rec = loadJurisdictionMiles({
    ...seedLoads()[0],
    stateMiles: 'GA 110, TN 140',
  });
  assert.equal(rec.estimated, false);
  assert.deepEqual(rec.miles, { GA: 110, TN: 140 });
});
test('the IFTA worksheet totals miles and tax-paid gallons by jurisdiction for a quarter', () => {
  const base = seedLoads()[0];
  const loads = [
    {
      ...base,
      id: 'a',
      origin: 'Atlanta, GA',
      destination: 'Nashville, TN',
      miles: 200,
      deadhead: 0,
      status: 'Delivered',
      deliveredOn: '2026-08-10',
      stateMiles: 'GA 80, TN 120',
    },
    {
      ...base,
      id: 'b',
      origin: 'Nashville, TN',
      destination: 'Memphis, TN',
      miles: 210,
      deadhead: 10,
      status: 'Delivered',
      deliveredOn: '2026-09-02',
      stateMiles: '',
    },
    {
      ...base,
      id: 'c',
      origin: 'Atlanta, GA',
      destination: 'Dallas, TX',
      miles: 780,
      deadhead: 0,
      status: 'Delivered',
      deliveredOn: '2026-05-02',
      stateMiles: '',
    },
    {
      ...base,
      id: 'd',
      origin: 'Atlanta, GA',
      destination: 'Dallas, TX',
      miles: 780,
      deadhead: 0,
      status: 'In transit',
      stateMiles: '',
    },
  ];
  const fuel = [
    {
      id: 'f1',
      date: '2026-08-10',
      jurisdiction: 'GA',
      fuelType: 'Diesel',
      gallons: 40,
      total: 150,
      def: 1.2,
      defTotal: 4,
      odometer: 0,
      loadId: 'a',
      driver: '',
      vendor: '',
      receipt: true,
      notes: '',
    },
    {
      id: 'f2',
      date: '2026-09-02',
      jurisdiction: 'TN',
      fuelType: 'Diesel',
      gallons: 30,
      total: 110,
      def: 0,
      defTotal: 0,
      odometer: 0,
      loadId: 'b',
      driver: '',
      vendor: '',
      receipt: false,
      notes: '',
    },
    {
      id: 'f3',
      date: '2026-05-02',
      jurisdiction: 'TX',
      fuelType: 'Diesel',
      gallons: 90,
      total: 300,
      def: 0,
      defTotal: 0,
      odometer: 0,
      loadId: 'c',
      driver: '',
      vendor: '',
      receipt: true,
      notes: '',
    },
  ];
  const q3 = iftaWorksheet(loads, fuel, '2026-Q3');
  assert.equal(q3.loads, 2);
  assert.equal(q3.stops, 2);
  assert.deepEqual(
    q3.rows.map((r) => r.jurisdiction),
    ['GA', 'TN'],
  );
  assert.equal(q3.rows[0].miles, 80);
  assert.equal(q3.rows[0].gallons, 40);
  assert.equal(q3.rows[1].miles, 340);
  assert.equal(q3.rows[1].estimatedMiles, 220);
  assert.equal(q3.totalMiles, 420);
  assert.equal(q3.totalGallons, 70);
  near(q3.mpg, 6);
  assert.equal(q3.spend, 260);
  assert.equal(q3.due, '2026-10-31');
  const q2 = iftaWorksheet(loads, fuel, '2026-Q2');
  assert.equal(q2.loads, 1);
  assert.equal(q2.rows.find((r) => r.jurisdiction === 'TX').gallons, 90);
  assert.equal(iftaWorksheet(loads, fuel, '2025-Q1').rows.length, 0);
});
test('DEF is estimated from diesel gallons at the truck dosing rate', () => {
  near(defNeeded(100, 3), 3);
  near(defNeeded(60, 2.5), 1.5);
  assert.equal(defNeeded(-5, 3), 0);
  assert.equal(defNeeded(50, 0), 0);
});
test('fuel reminders flag unlogged trips, missing receipts and filing deadlines', () => {
  const base = seedLoads()[0];
  const loads = [
    { ...base, id: 'road', order: 'R-1', status: 'In transit', sample: false },
    {
      ...base,
      id: 'done',
      order: 'D-1',
      status: 'Delivered',
      deliveredOn: '2026-09-12',
      sample: false,
    },
    {
      ...base,
      id: 'old',
      order: 'O-1',
      status: 'Delivered',
      deliveredOn: '2026-07-01',
      sample: false,
    },
    {
      ...base,
      id: 'short',
      order: 'S-1',
      status: 'In transit',
      miles: 40,
      deadhead: 0,
      sample: false,
    },
    {
      ...base,
      id: 'logged',
      order: 'L-1',
      status: 'In transit',
      sample: false,
    },
  ];
  const fuel = [
    {
      id: 'f1',
      date: '2026-09-10',
      jurisdiction: 'GA',
      fuelType: 'Diesel',
      gallons: 40,
      total: 150,
      def: 0,
      defTotal: 0,
      odometer: 0,
      loadId: 'logged',
      driver: '',
      vendor: '',
      receipt: false,
      notes: '',
    },
  ];
  const r = fuelReminders(loads, fuel, '2026-09-15');
  assert.deepEqual(
    r.filter((x) => x.kind === 'log').map((x) => x.loadId),
    ['road', 'done'],
  );
  assert.equal(r.filter((x) => x.kind === 'receipt').length, 1);
  assert.equal(r.filter((x) => x.kind === 'filing').length, 0);
  const due = fuelReminders([], [], '2026-10-20');
  assert.equal(due[0].kind, 'filing');
  assert.ok(due[0].title.includes('2026-Q3'));
  const closing = fuelReminders([], [], '2026-09-25');
  assert.equal(closing[0].kind, 'filing');
  assert.ok(closing[0].title.includes('closes'));
});
test('sample fuel stops match sample delivered diesel loads and validate', () => {
  const stops = seedFuel(seedLoads());
  assert.ok(stops.length >= 5);
  for (const f of stops) {
    assert.ok(f.sample);
    assert.equal(validateFuel(f).id, f.id);
  }
  const ids = new Set(seedLoads().map((l) => l.id));
  assert.ok(stops.every((f) => ids.has(f.loadId)));
});
test('fuel validation rejects bad jurisdictions, gallons and dates', () => {
  const ok = seedFuel(seedLoads())[0];
  assert.equal(validateFuel({ ...ok, receipt: 'yes' }).receipt, false);
  for (const patch of [
    { jurisdiction: 'HI' },
    { gallons: 0 },
    { date: '2026-13-01' },
    { def: -1 },
    { fuelType: 'Propane' },
  ])
    assert.throws(
      () => validateFuel({ ...ok, ...patch }),
      JSON.stringify(patch),
    );
});
test('load and preference validation cover the new return, IFTA and hours fields', () => {
  const l = seedLoads()[0];
  assert.equal(
    validateLoad({ ...l, returnMode: undefined }).returnMode,
    'Unspecified',
  );
  assert.equal(
    validateLoad({ ...l, returnMode: 'Flight', returnHub: ' BNA ' }).returnHub,
    'BNA',
  );
  assert.throws(() => validateLoad({ ...l, returnMode: 'Helicopter' }));
  assert.throws(() => validateLoad({ ...l, stateMiles: 'Georgia 120' }));
  assert.equal(
    validateLoad({ ...l, stateMiles: 'GA 120, TN 130' }).stateMiles,
    'GA 120, TN 130',
  );
  const {
    returnMode,
    hoursRule,
    cycle,
    avgMph,
    hoursLog,
    hoursLogDate,
    truck,
    defRate,
    ...legacy
  } = defaults;
  void returnMode;
  void hoursRule;
  void cycle;
  void avgMph;
  void hoursLog;
  void hoursLogDate;
  void truck;
  void defRate;
  assert.deepEqual(validatePreferences(legacy), defaults);
  assert.equal(validatePreferences({ ...defaults, cycle: 60 }).cycle, 60);
  assert.throws(() => validatePreferences({ ...defaults, cycle: 65 }));
  assert.throws(() => validatePreferences({ ...defaults, hoursRule: 'nope' }));
  assert.throws(() => validatePreferences({ ...defaults, hoursLog: [1, 2] }));
  assert.throws(() =>
    validatePreferences({ ...defaults, hoursLog: [0, 0, 0, 0, 0, 0, 0, 25] }),
  );
  assert.throws(() => validatePreferences({ ...defaults, defRate: 11 }));
  assert.throws(() => validatePreferences({ ...defaults, returnMode: 'Boat' }));
});
