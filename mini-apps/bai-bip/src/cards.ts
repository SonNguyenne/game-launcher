/**
 * Lá bài: một số 0..51 = hạng * 4 + chất. Hạng 0 là A, 1 là 2, ... 12 là K
 * (đúng thứ tự khai A, 2, 3... của bài bịp). Chất 0 ♠, 1 ♣, 2 ♦, 3 ♥.
 */
export type Card = number;

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export const SUITS = ['♠', '♣', '♦', '♥'] as const;
export const SUIT_NAMES = ['bích', 'chuồn', 'rô', 'cơ'] as const;

export const rankOf = (c: Card) => c >> 2;
export const suitOf = (c: Card) => c & 3;
export const isRed = (c: Card) => suitOf(c) >= 2;
export const cardOf = (rank: number, suit: number): Card => rank * 4 + suit;
export const isCard = (c: unknown): c is Card => Number.isInteger(c) && (c as number) >= 0 && (c as number) < 52;
export const fullDeck = (): Card[] => Array.from({ length: 52 }, (_, i) => i);
export const sortCards = (cards: readonly Card[]) => [...cards].sort((a, b) => a - b);
export const cardName = (c: Card) => `${RANKS[rankOf(c)]} ${SUIT_NAMES[suitOf(c)]}`;
