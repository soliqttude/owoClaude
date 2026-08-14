import { EmbedBuilder } from "discord.js";

export const GAME_COLORS = {
  blue: 0x5865f2,
  green: 0x23a55a,
  red: 0xed4245,
  gold: 0xf0b232,
  purple: 0x9b59b6,
} as const;

export function gameEmbed(title: string, color: number, description?: string) {
  const embed = new EmbedBuilder().setColor(color).setTitle(title);
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