import { describe, it, expect } from 'vitest';
import { formatTime, formatMs } from '../formatTime';

describe('formatTime', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats 59 seconds as 00:59', () => {
    expect(formatTime(59)).toBe('00:59');
  });

  it('formats 60 seconds as 01:00', () => {
    expect(formatTime(60)).toBe('01:00');
  });

  it('formats 90 seconds as 01:30', () => {
    expect(formatTime(90)).toBe('01:30');
  });

  it('formats 3661 seconds as 61:01', () => {
    expect(formatTime(3661)).toBe('61:01');
  });

  it('pads single-digit minutes', () => {
    expect(formatTime(300)).toBe('05:00');
  });

  it('pads single-digit seconds', () => {
    expect(formatTime(65)).toBe('01:05');
  });
});

describe('formatMs', () => {
  it('formats 0ms as 0s', () => {
    expect(formatMs(0)).toBe('0s');
  });

  it('formats 5000ms as 5s', () => {
    expect(formatMs(5000)).toBe('5s');
  });

  it('formats 59000ms as 59s', () => {
    expect(formatMs(59000)).toBe('59s');
  });

  it('formats 60000ms as 1m 0s', () => {
    expect(formatMs(60000)).toBe('1m 0s');
  });

  it('formats 150000ms as 2m 30s', () => {
    expect(formatMs(150000)).toBe('2m 30s');
  });

  it('rounds to nearest second', () => {
    expect(formatMs(1500)).toBe('2s');
  });
});
