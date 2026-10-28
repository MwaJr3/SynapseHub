import { describe, expect, it } from 'vitest';
import { connectFourWinner, shuffled, ticTacToeResult, type Disc } from './gameLogic';

describe('tic-tac-toe outcome rules', () => {
  it('detects row, column, and diagonal wins', () => {
    expect(ticTacToeResult(['X', 'X', 'X', 'O', null, 'O', null, null, null])).toBe('X');
    expect(ticTacToeResult(['O', 'X', null, 'O', 'X', null, 'O', null, 'X'])).toBe('O');
    expect(ticTacToeResult(['X', 'O', 'O', null, 'X', null, 'O', null, 'X'])).toBe('X');
  });
  it('distinguishes an open board from a draw', () => {
    expect(ticTacToeResult(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'])).toBe('draw');
    expect(ticTacToeResult(['X', null, null, null, 'O', null, null, null, null])).toBeNull();
  });
});

describe('Connect Four outcome rules', () => {
  const board = (): Disc[][] => Array.from({ length: 6 }, () => Array<Disc>(7).fill(0));
  it('detects a horizontal win', () => {
    const next = board(); next[5]![0] = 1; next[5]![1] = 1; next[5]![2] = 1; next[5]![3] = 1;
    expect(connectFourWinner(next)).toBe(1);
  });
  it('detects a vertical win and rejects incomplete runs', () => {
    const next = board(); next[5]![2] = 2; next[4]![2] = 2; next[3]![2] = 2; next[2]![2] = 2;
    expect(connectFourWinner(next)).toBe(2);
    next[2]![2] = 0;
    expect(connectFourWinner(next)).toBe(0);
  });
});

it('shuffles without losing or duplicating values', () => {
  const input = [1, 2, 3, 4, 5];
  expect(shuffled(input, () => 0)).toHaveLength(input.length);
  expect(shuffled(input, () => 0).sort()).toEqual(input);
  expect(input).toEqual([1, 2, 3, 4, 5]);
});
