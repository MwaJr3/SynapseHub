import type { ScheduleBlock } from './types';

function icsDate(date: string, time: string): string {
  return `${date.replaceAll('-', '')}T${time.replace(':', '')}00`;
}

function escapeIcs(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll(';', '\\;').replaceAll(',', '\\,').replaceAll('\n', '\\n');
}

/** A local .ics export; no third-party calendar account or OAuth token is used. */
export function scheduleToIcs(blocks: ScheduleBlock[]): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const events = blocks
    .filter((block) => block.date && block.startTime && block.endTime)
    .map((block) => [
      'BEGIN:VEVENT',
      `UID:${escapeIcs(block.id)}@personal-os.local`,
      `DTSTAMP:${now}`,
      `DTSTART:${icsDate(block.date, block.startTime)}`,
      `DTEND:${icsDate(block.date, block.endTime)}`,
      `SUMMARY:${escapeIcs(block.title)}`,
      block.location ? `LOCATION:${escapeIcs(block.location)}` : '',
      block.notes ? `DESCRIPTION:${escapeIcs(block.notes)}` : '',
      'END:VEVENT',
    ].filter(Boolean).join('\r\n'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Personal OS//EN', 'CALSCALE:GREGORIAN', events, 'END:VCALENDAR'].filter(Boolean).join('\r\n');
}

export function minutesSinceMidnight(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function blockDurationMinutes(block: ScheduleBlock): number {
  return Math.max(0, minutesSinceMidnight(block.endTime) - minutesSinceMidnight(block.startTime));
}
