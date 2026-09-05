import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaults,
  seedLoads,
  costs,
  optimize,
  distance,
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
