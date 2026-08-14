import { Message } from "discord.js";
import { Command } from "../command";
import { gamblingService, formatCurrency, parseBet, pick } from "../../services/GamblingService";
import { GAME_COLORS, gameEmbed } from "./ui";

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
    const won = result.payout > 0n;
    const embed = gameEmbed(
      won ? "🎰 SLOTS — WIN" : "🎰 SLOTS",
      won ? GAME_COLORS.green : GAME_COLORS.purple,
      [
        `**${message.member?.displayName ?? message.author.username}** spun the reels.`,
        "",
        "```",
        "╭───────────────╮",
        `│  ${reels.join("  │  ")}  │`,
        "╰───────────────╯",
        "```",
        won ? `✨ You won **${formatCurrency(result.payout)}**!` : "No match this spin.",
      ].join("\n"),
    );
    embed.addFields(
      { name: "Bet", value: `💵 ${formatCurrency(bet)}`, inline: true },
      { name: "Payout", value: `💰 ${formatCurrency(result.payout)}`, inline: true },
      { name: "Balance", value: `🪙 ${formatCurrency(result.balance)}`, inline: true },
    );
    await message.reply({ embeds: [embed.toJSON()] });
  },
};