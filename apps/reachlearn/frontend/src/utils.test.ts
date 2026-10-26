import { describe, expect, it } from 'vitest';
import { SIMULATOR_NOTICE, channelTone, jobTone } from './utils';

describe('jobTone', () => {
  it('maps delivery states', () => {
    expect(jobTone('delivered')).toContain('emerald');
    expect(jobTone('failed')).toContain('rose');
  });
});

describe('SIMULATOR_NOTICE', () => {
  it('says sends are never real carrier delivery', () => {
    expect(SIMULATOR_NOTICE).toContain('never real carrier delivery');
  });
});

describe('channelTone', () => {
  it('maps channels', () => {
    expect(channelTone('sms')).toContain('indigo');
    expect(channelTone('ussd')).toContain('teal');
    expect(channelTone('ivr')).toContain('violet');
  });
});
