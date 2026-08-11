import { Message } from "discord.js";
import { Command, CommandError } from "../command";
import { gamblingService, formatCurrency, parseBet, pick } from "../../services/GamblingService";

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
    await message.reply(
      `🪙 The coin landed on **${flip}**.\n${payout > 0n ? `You won **${formatCurrency(payout)}**!` : "The house wins this time."}\nBalance: **${formatCurrency(result.balance)}**`,
    );
  },
};