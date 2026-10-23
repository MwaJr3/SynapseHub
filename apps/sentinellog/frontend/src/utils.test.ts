import { describe, expect, it } from 'vitest';
import { formatBytes, formatTimestamp, severityTone } from './utils';

describe('formatBytes', () => {
  it('formats small sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
  });
  it('formats kilobytes and megabytes', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('formatTimestamp', () => {
  it('handles missing values', () => {
    expect(formatTimestamp(null)).toBe('—');
  });
  it('passes through invalid dates without crashing', () => {
    expect(formatTimestamp('not-a-date')).toBe('not-a-date');
  });
});

describe('severityTone', () => {
  it('maps known severities to distinct styles', () => {
    expect(severityTone('high')).toContain('rose');
    expect(severityTone('medium')).toContain('amber');
    expect(severityTone('low')).toContain('sky');
    expect(severityTone('unknown')).toContain('slate');
  });
});
