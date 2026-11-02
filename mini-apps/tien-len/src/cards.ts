/**
 * Lá bài tiến lên: một số 0..51 = hạng * 4 + chất.
 * Hạng 0 là 3, ... 11 là A, 12 là 2 (heo). Chất 0 ♠, 1 ♣, 2 ♦, 3 ♥.
 * Nhờ cách đánh số này, so hai lá chỉ cần so số: hạng trước, chất sau.
 */
export type Card = number;

export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'] as const;
export const SUITS = ['♠', '♣', '♦', '♥'] as const;
export const SUIT_NAMES = ['bích', 'chuồn', 'rô', 'cơ'] as const;

/** Hạng của heo (lá 2). */
export const TWO = 12;

export const rankOf = (c: Card) => c >> 2;
export const suitOf = (c: Card) => c & 3;
export const isRed = (c: Card) => suitOf(c) >= 2;
export const cardOf = (rank: number, suit: number): Card => rank * 4 + suit;
export const isCard = (c: unknown): c is Card => Number.isInteger(c) && (c as number) >= 0 && (c as number) < 52;

export const fullDeck = (): Card[] => Array.from({ length: 52 }, (_, i) => i);
export const sortCards = (cards: readonly Card[]) => [...cards].sort((a, b) => a - b);

export const cardLabel = (c: Card) => `${RANKS[rankOf(c)]}${SUITS[suitOf(c)]}`;
export const cardName = (c: Card) => `${RANKS[rankOf(c)]} ${SUIT_NAMES[suitOf(c)]}`;
