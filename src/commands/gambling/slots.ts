import { Message } from "discord.js";
import { Command } from "../command";
import { gamblingService, formatCurrency, parseBet, pick } from "../../services/GamblingService";

const SYMBOLS = ["🍒", "🔔", "⭐", "💎", "7️⃣"] as const;

export const slotsCommand: Command = {
  data: { name: "slots", description: "Spin three reels and match symbols to win." },
  cooldownSeconds: 10,
  async execute(message: Message, args: string[]) {
    const bet = parseBet(args[0]);
    const reels = [pick(SYMBOLS), pick(SYMBOLS), pick(SYMBOLS)];
    const counts = new Map<string, number>();
    for (const symbol of reels) counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    const highestMatch = Math.max(...counts.values());
    const payout = highestMatch === 3 ? bet * BigInt(reels[0] === "7️⃣" ? 8 : 5) : highestMatch === 2 ? (bet * 3n) / 2n : 0n;
    const result = await gamblingService.settleBet(message.author.id, bet, "Slots", () => ({ payout, result: reels }));
    const outcome = result.payout > 0n ? `You won **${formatCurrency(result.payout)}**!` : "No match this spin.";
    await message.reply(`🎰 **${reels.join(" | ")}**\n${outcome}\nBalance: **${formatCurrency(result.balance)}**`);
  },
};