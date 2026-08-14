import { Message } from "discord.js";
import { Command, CommandError } from "../command";
import { gamblingService, formatCurrency, parseBet, pick } from "../../services/GamblingService";
import { GAME_COLORS, gameEmbed } from "./ui";

const SIDES = ["heads", "tails"] as const;

export const coinflipCommand: Command = {
  data: { name: "coinflip", description: "Bet on heads or tails." },
  cooldownSeconds: 10,
  async execute(message: Message, args: string[]) {
    const bet = parseBet(args[0]);
    const guess = args[1]?.toLowerCase();
    if (guess !== "heads" && guess !== "tails") {
      throw new CommandError("INVALID_GUESS", "Choose **heads** or **tails**. Example: `owo coinflip 100 heads`.");
    }
    const flip = pick(SIDES);
    const payout = flip === guess ? (bet * 19n) / 10n : 0n;
    const result = await gamblingService.settleBet(message.author.id, bet, "Coinflip", () => ({ payout, result: flip }));
    const won = payout > 0n;
    const embed = gameEmbed(
      won ? "🪙 COINFLIP — WIN" : "🪙 COINFLIP",
      won ? GAME_COLORS.green : GAME_COLORS.red,
      `The coin landed on **${flip}**.\n${won ? `✨ You won **${formatCurrency(payout)}**!` : "The house wins this time."}`,
    );
    embed.addFields(
      { name: "Your guess", value: guess === "heads" ? "🟡 Heads" : "⚪ Tails", inline: true },
      { name: "Bet", value: `💵 ${formatCurrency(bet)}`, inline: true },
      { name: "Balance", value: `🪙 ${formatCurrency(result.balance)}`, inline: true },
    );
    await message.reply({ embeds: [embed.toJSON()] });
  },
};