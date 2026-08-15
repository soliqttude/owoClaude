import { EmbedBuilder } from "discord.js";

export const GAME_COLORS = {
  blue: 0x69b9ed,
  green: 0x23a55a,
  red: 0xed4245,
  gold: 0xf0b232,
  purple: 0x9b59b6,
} as const;

export function gameEmbed(title: string, color: number, description?: string) {
  const embed = new EmbedBuilder().setColor(color);
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

export function formatMultiplier(payout: bigint, bet: bigint) {
  if (bet === 0n) return "0.00x";
  const whole = (payout * 100n) / bet;
  return `${whole / 100n}.${(whole % 100n).toString().padStart(2, "0")}x`;
}

export function cardLabel(value: number) {
  return value === 1 ? "A" : value === 11 ? "J" : value === 12 ? "Q" : value === 13 ? "K" : String(value);
}

const CARD_BASES: Record<string, number> = {
  "♠": 0x1f0a0,
  "♥": 0x1f0b0,
  "♦": 0x1f0c0,
  "♣": 0x1f0d0,
};

const CARD_OFFSETS: Record<string, number> = {
  A: 0x1,
  "2": 0x2,
  "3": 0x3,
  "4": 0x4,
  "5": 0x5,
  "6": 0x6,
  "7": 0x7,
  "8": 0x8,
  "9": 0x9,
  "10": 0xa,
  J: 0xb,
  Q: 0xd,
  K: 0xe,
};

export function cardGlyph(rank: string, suit: string) {
  const base = CARD_BASES[suit];
  const offset = CARD_OFFSETS[rank];
  return base && offset ? String.fromCodePoint(base + offset) : "🂠";
}