import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatPercent,
  formatDuration,
  cn,
  clamp,
  getStatusColor,
} from '../utils';

describe('formatNumber', () => {
  it('formats thousands with commas', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatPercent', () => {
  it('formats with default 1 decimal', () => {
    expect(formatPercent(42.567)).toBe('42.6%');
  });

  it('respects custom decimals', () => {
    expect(formatPercent(42.567, 2)).toBe('42.57%');
  });

  it('handles negative values', () => {
    expect(formatPercent(-3.2)).toBe('-3.2%');
  });
});

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2m 5s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3725)).toBe('1h 2m');
  });
});

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('returns empty string when all falsy', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});

describe('clamp', () => {
  it('returns min when value is below range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('returns max when value is above range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe('getStatusColor', () => {
  it('returns green for success', () => {
    expect(getStatusColor('success')).toContain('emerald');
  });

  it('returns red for failed', () => {
    expect(getStatusColor('failed')).toContain('red');
  });

  it('returns blue for running', () => {
    expect(getStatusColor('running')).toContain('blue');
  });
});
