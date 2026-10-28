import { describe, expect, it } from 'vitest';
import {
  checkContrast,
  checkFeedbackLatency,
  checkMotionDuration,
  checkRadius,
  checkSpacing,
  checkTouchTarget,
  checkZIndex,
  contrastRatio,
  parseHexColor,
} from './constraints';

describe('WCAG contrast math', () => {
  it('parses shorthand and full hex colours', () => {
    expect(parseHexColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHexColor('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('computes the textbook black/white ratio of 21:1', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBe(21);
    expect(contrastRatio('#000', '#fff')).toBe(21);
  });

  it('rejects unsupported colour formats', () => {
    expect(() => parseHexColor('rgb(1,2,3)')).toThrow();
  });

  it('applies the 4.5:1 normal and 3:1 large-text thresholds', () => {
    // White on the portfolio accent blue passes AA for normal text.
    const normal = checkContrast('#ffffff', '#2547d6', { textSizePx: 14 });
    expect(normal.aaNormal).toBe(true);
    expect(normal.required).toBe(4.5);

    // Light blue on near-white fails normal text but can pass as large text.
    const faint = checkContrast('#9fb0d8', '#f4f7ff', { textSizePx: 14 });
    expect(faint.aaNormal).toBe(false);

    const large = checkContrast('#9fb0d8', '#f4f7ff', { textSizePx: 24 });
    expect(large.required).toBe(3);
  });

  it('treats 18.67px bold text as large', () => {
    const verdict = checkContrast('#79859a', '#ffffff', {
      textSizePx: 18.67,
      bold: true,
    });
    expect(verdict.required).toBe(3);
  });
});

describe('deterministic spatial and motion constraints', () => {
  it('enforces the 44px touch target', () => {
    expect(checkTouchTarget(44).pass).toBe(true);
    expect(checkTouchTarget(32).pass).toBe(false);
    expect(checkTouchTarget(32).ruleId).toBe('A11Y-TARGET-01');
  });

  it('only accepts values on the 4px spacing scale', () => {
    expect(checkSpacing(16).pass).toBe(true);
    expect(checkSpacing(13).pass).toBe(false);
    expect(checkSpacing(7).ruleId).toBe('TOKEN-SPACING-01');
  });

  it('only accepts radii on the shared scale', () => {
    expect(checkRadius(12).pass).toBe(true);
    expect(checkRadius(9).pass).toBe(false);
  });

  it('keeps motion inside the 100–500ms vocabulary', () => {
    expect(checkMotionDuration(150).pass).toBe(true);
    expect(checkMotionDuration(700).pass).toBe(false);
    expect(checkMotionDuration(50).pass).toBe(false);
  });

  it('enforces the ~100ms Doherty acknowledgement', () => {
    expect(checkFeedbackLatency(80).pass).toBe(true);
    expect(checkFeedbackLatency(250).pass).toBe(false);
  });

  it('rejects escalated z-index values', () => {
    expect(checkZIndex(40).pass).toBe(true);
    expect(checkZIndex(9999).pass).toBe(false);
  });
});
