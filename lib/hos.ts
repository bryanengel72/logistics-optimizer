import type { Load, Preferences } from './model';
/**
 * Hours-of-service rule sets. FMCSA limits (49 CFR 395) apply to commercial
 * motor vehicles over 10,000 lb in interstate commerce whether or not the
 * driver holds a CDL; rideshare and light-vehicle work is governed by the
 * platform's own fatigue limits instead.
 */
export type HoursRule = {
  key: string;
  label: string;
  short: string;
  /** Maximum driving hours in one shift. */
  driving: number;
  /** On-duty window in hours; driving must stop when it closes. */
  window: number;
  /** Cumulative driving hours that trigger a required break (0 = none). */
  breakAfter: number;
  breakMinutes: number;
  /** Consecutive off-duty hours before the next shift. */
  offDuty: number;
  /** Whether the 60/7 or 70/8 on-duty cycle applies. */
  cycle: boolean;
  note: string;
};
export const hoursRules: Record<string, HoursRule> = {
  property: {
    key: 'property',
    label: 'DOT property-carrying (CDL or any truck over 10,000 lb)',
    short: 'DOT property rules',
    driving: 11,
    window: 14,
    breakAfter: 8,
    breakMinutes: 30,
    offDuty: 10,
    cycle: true,
    note: '11 hours driving inside a 14-hour window after 10 consecutive hours off. A 30-minute break is required after 8 cumulative hours of driving. 60 hours in 7 days or 70 hours in 8 days; a 34-hour off-duty period restarts the cycle.',
  },
  passenger: {
    key: 'passenger',
    label: 'DOT passenger-carrying (bus, motorcoach, van over 8 passengers)',
    short: 'DOT passenger rules',
    driving: 10,
    window: 15,
    breakAfter: 0,
    breakMinutes: 0,
    offDuty: 8,
    cycle: true,
    note: '10 hours driving inside a 15-hour on-duty window after 8 consecutive hours off. 60 hours in 7 days or 70 hours in 8 days.',
  },
  rideshare: {
    key: 'rideshare',
    label: 'Non-CDL rideshare or light vehicle (Uber, Lyft, courier)',
    short: 'rideshare limits',
    driving: 12,
    window: 12,
    breakAfter: 0,
    breakMinutes: 0,
    offDuty: 6,
    cycle: false,
    note: 'Uber and Lyft lock the app after 12 hours of driving time until you take 6 consecutive hours off. Some cities (for example New York) cap drivers at 10 hours in 24. No federal weekly cycle applies to vehicles under 10,001 lb.',
  },
};
export const hoursRuleKeys = Object.keys(hoursRules);
/** Loads flagged CDL always fall under DOT property-carrying limits. */
export function ruleFor(
  l: Pick<Load, 'cdl'>,
  p: Pick<Preferences, 'hoursRule'>,
) {
  if (l.cdl) return hoursRules.property;
  return hoursRules[p.hoursRule] || hoursRules.property;
}
export type TripSchedule = {
  /** Wheel time at the assumed average speed. */
  hours: number;
  /** Minimum calendar driving days under the rule. */
  days: number;
  /** Required 30-minute breaks across the trip. */
  breaks: number;
  /** Driving hours on the final day. */
  lastDay: number;
};
/** Splits a trip into legal driving days at an assumed average speed. */
export function tripSchedule(
  miles: number,
  rule: HoursRule,
  avgMph: number,
): TripSchedule {
  const hours = Math.max(0, miles) / Math.max(1, avgMph);
  let left = hours,
    days = 0,
    breaks = 0,
    lastDay = 0;
  while (left > 1e-9 || days === 0) {
    const today = Math.min(rule.driving, left);
    if (rule.breakAfter > 0 && today > rule.breakAfter + 1e-9)
      breaks += Math.floor((today - 1e-9) / rule.breakAfter);
    left -= today;
    lastDay = today;
    days++;
    if (days > 60) break;
  }
  return { hours, days, breaks, lastDay };
}
export type CycleStatus = {
  /** Days in the cycle window (7 or 8). */
  days: number;
  /** On-duty hours counted in the window. */
  used: number;
  /** Hours left in the cycle; Infinity when no cycle applies. */
  remaining: number;
  /** Driving hours available today after today's on-duty time. */
  availableToday: number;
  /** Hours that drop out of the window tomorrow. */
  tomorrowGain: number;
  /** True when waiting a day still would not allow a full driving shift. */
  restartAdvised: boolean;
  /** Human-readable summary. */
  summary: string;
};
/**
 * Evaluates the rolling on-duty cycle from a log of daily on-duty hours,
 * oldest first, with the last entry being today.
 */
export function cycleStatus(
  log: number[],
  rule: HoursRule,
  cycle: number,
): CycleStatus {
  const days = cycle === 60 ? 7 : 8;
  const clean = log.map((h) => Math.min(24, Math.max(0, Number(h) || 0)));
  const recent = clean.slice(-days);
  const today = recent.length ? recent[recent.length - 1] : 0;
  const used = recent.reduce((s, h) => s + h, 0);
  const remaining = rule.cycle ? Math.max(0, cycle - used) : Infinity;
  const availableToday = Math.max(
    0,
    Math.min(rule.driving - today, rule.window - today, remaining),
  );
  const tomorrowGain = rule.cycle && recent.length >= days ? recent[0] : 0;
  const restartAdvised = rule.cycle && remaining + tomorrowGain < rule.driving;
  const summary = !rule.cycle
    ? `No weekly cycle under ${rule.short}. ${availableToday.toFixed(1)} h of driving left today before a ${rule.offDuty}-hour break.`
    : remaining <= 0
      ? `Cycle exhausted: ${used.toFixed(1)} of ${cycle} h used in ${days} days. Take a 34-hour restart or wait for ${tomorrowGain.toFixed(1)} h to drop off tomorrow.`
      : `${remaining.toFixed(1)} h left in the ${cycle}/${days} cycle · up to ${availableToday.toFixed(1)} h driving today.`;
  return {
    days,
    used,
    remaining,
    availableToday,
    tomorrowGain,
    restartAdvised,
    summary,
  };
}
/** Total wheel time for a set of loads including deadhead. */
export function planDrivingHours(
  loads: Pick<Load, 'miles' | 'deadhead'>[],
  avgMph: number,
) {
  return loads.reduce(
    (s, l) => s + (l.miles + l.deadhead) / Math.max(1, avgMph),
    0,
  );
}
/**
 * Re-aligns a saved eight-day log so its last entry is today, dropping days
 * that have aged out of the window and padding new days with zero.
 */
export function shiftHoursLog(
  log: number[] | undefined,
  logDate: string,
  today: string,
): number[] {
  const blank = [0, 0, 0, 0, 0, 0, 0, 0];
  const base =
    Array.isArray(log) && log.length === 8
      ? log.map((h) => Number(h) || 0)
      : blank;
  if (!logDate) return base;
  const d = Math.round((Date.parse(today) - Date.parse(logDate)) / 86400000);
  if (!(d > 0)) return base;
  if (d >= 8) return blank;
  return [...base.slice(d), ...blank.slice(0, d)];
}
