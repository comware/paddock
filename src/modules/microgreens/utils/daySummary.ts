/**
 * Day summary - what the app already knows about today
 *
 * The daily log asked the grower to type in tray counts while displaying the correct
 * answer immediately below the field. Three of its seven questions were transcription,
 * not observation.
 *
 * This derives everything derivable, so the log can present a day and ask only for the
 * parts a person actually holds: how it felt, what they noticed, what they learned.
 *
 * Three groups, because they answer different questions:
 *   counts   - the state of the bench right now
 *   happened - what changed today, which is what a log records
 *   due      - what needs attention, which is what a log is read for
 */

import { differenceInCalendarDays, isSameDay, startOfDay } from 'date-fns';
import type { GrowPlannedPlanting, GrowVarietyConfig } from '@/lib/db';
import type { TrayWithComputed } from '../stores';

export interface DayEvent {
  kind: 'sown' | 'light' | 'harvested';
  text: string;
  trayId?: string;
}

export interface DueItem {
  kind: 'light' | 'harvest' | 'sow';
  text: string;
  /** Positive when the item is late. */
  overdueDays: number;
  trayId?: string;
  plantingId?: string;
}

export interface DaySummary {
  counts: {
    blackout: number;
    light: number;
    harvestedToday: number;
  };
  happened: DayEvent[];
  due: DueItem[];
}

interface DeriveInput {
  trays: TrayWithComputed[];
  plantings: GrowPlannedPlanting[];
  varieties: GrowVarietyConfig[];
  siteId?: string;
  /** Defaults to now. Passed explicitly so this can be tested. */
  today?: Date;
}

const forSite = <T extends { siteId?: string }>(items: T[], siteId?: string): T[] =>
  siteId ? items.filter((item) => !item.siteId || item.siteId === siteId) : items;

const trayName = (tray: TrayWithComputed): string =>
  `Tray #${tray.trayNumber} (${tray.variety})`;

export function deriveDaySummary({
  trays,
  plantings,
  varieties,
  siteId,
  today = new Date(),
}: DeriveInput): DaySummary {
  const day = startOfDay(today);
  const siteTrays = forSite(trays, siteId);
  const sitePlantings = forSite(plantings, siteId);

  const configFor = (variety: string) => varieties.find((v) => v.name === variety);

  const happened: DayEvent[] = [];
  const due: DueItem[] = [];

  for (const tray of siteTrays) {
    const sown = startOfDay(new Date(tray.dateSown));
    const harvested = tray.dateHarvested ? startOfDay(new Date(tray.dateHarvested)) : null;

    if (isSameDay(sown, day)) {
      happened.push({ kind: 'sown', text: `Sowed ${trayName(tray)}`, trayId: tray.id });
    }

    if (harvested && isSameDay(harvested, day)) {
      happened.push({
        kind: 'harvested',
        text: `Harvested ${trayName(tray)}${
          tray.harvestWeight ? ` — ${tray.harvestWeight} g` : ''
        }`,
        trayId: tray.id,
      });
    }

    // Everything below concerns trays still growing.
    if (harvested) continue;

    const blackoutDays = tray.blackoutDays;
    if (blackoutDays) {
      const lightDate = startOfDay(
        new Date(sown.getTime() + blackoutDays * 86_400_000),
      );

      if (isSameDay(lightDate, day)) {
        happened.push({
          kind: 'light',
          text: `${trayName(tray)} due out of blackout`,
          trayId: tray.id,
        });
      } else if (tray.status === 'blackout' && lightDate < day) {
        due.push({
          kind: 'light',
          text: `${trayName(tray)} should be in light`,
          overdueDays: differenceInCalendarDays(day, lightDate),
          trayId: tray.id,
        });
      }
    }

    const days = configFor(tray.variety)?.typicalDaysToHarvest;
    if (days) {
      const harvestDate = startOfDay(new Date(sown.getTime() + days * 86_400_000));
      const late = differenceInCalendarDays(day, harvestDate);

      if (late >= 0) {
        due.push({
          kind: 'harvest',
          text:
            late === 0
              ? `${trayName(tray)} ready to harvest`
              : `${trayName(tray)} was ready to harvest`,
          overdueDays: late,
          trayId: tray.id,
        });
      }
    }
  }

  // Sowings scheduled for today or earlier that have not been converted to a tray.
  for (const planting of sitePlantings) {
    if (planting.status !== 'planned') continue;

    const sowDate = startOfDay(new Date(planting.plannedSowDate));
    const late = differenceInCalendarDays(day, sowDate);
    if (late < 0) continue;

    due.push({
      kind: 'sow',
      text: `Sow ${planting.quantity} ${
        planting.quantity === 1 ? 'tray' : 'trays'
      } of ${planting.variety}`,
      overdueDays: late,
      plantingId: planting.id,
    });
  }

  return {
    counts: {
      blackout: siteTrays.filter((t) => t.status === 'blackout').length,
      light: siteTrays.filter((t) => t.status === 'light').length,
      harvestedToday: siteTrays.filter(
        (t) => t.dateHarvested && isSameDay(new Date(t.dateHarvested), day),
      ).length,
    },
    // Most overdue first: the thing that has been waiting longest is the thing most
    // likely to have been forgotten.
    happened,
    due: due.sort((a, b) => b.overdueDays - a.overdueDays),
  };
}

/**
 * A one-line, plain-language version of the day, for prefilling "actions taken".
 *
 * Returns an empty string when nothing happened rather than a sentence saying so - a log
 * entry reading "nothing happened today" is worse than a blank one.
 */
export function summariseActions(summary: DaySummary): string {
  if (summary.happened.length === 0) return '';
  return summary.happened.map((e) => e.text).join('. ') + '.';
}
