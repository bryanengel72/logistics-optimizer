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
