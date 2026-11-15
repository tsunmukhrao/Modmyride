import { z } from 'zod';

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}, 'Enter a real calendar date.');

export const reportDateRangeSchema = z.object({ from: calendarDate, to: calendarDate }).superRefine(({ from, to }, context) => {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (end < start) context.addIssue({ code: 'custom', path: ['to'], message: 'End date must be on or after start date.' });
  if (end >= start && (end - start) / 86_400_000 > 365) {
    context.addIssue({ code: 'custom', path: ['to'], message: 'Choose a date range of one year or less.' });
  }
});

export type ReportDateRange = z.infer<typeof reportDateRangeSchema>;
