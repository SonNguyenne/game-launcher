/**
 * Lá bài poker: một số 0..51 = hạng * 4 + chất.
 * Hạng 0 là 2, ... 12 là A. Chất 0 ♠, 1 ♥, 2 ♦, 3 ♣ (poker không xếp chất trên dưới).
 */
export type Card = number;

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
export const SUITS = ['♠', '♥', '♦', '♣'] as const;
export const SUIT_NAMES = ['bích', 'cơ', 'rô', 'chuồn'] as const;

export const rankOf = (c: Card) => c >> 2;
export const suitOf = (c: Card) => c & 3;
export const isRed = (c: Card) => suitOf(c) === 1 || suitOf(c) === 2;
export const cardOf = (rank: number, suit: number): Card => rank * 4 + suit;
export const fullDeck = (): Card[] => Array.from({ length: 52 }, (_, i) => i);
export const cardName = (c: Card) => `${RANKS[rankOf(c)]} ${SUIT_NAMES[suitOf(c)]}`;
