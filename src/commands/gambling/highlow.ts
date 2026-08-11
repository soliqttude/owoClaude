import { Message } from "discord.js";
import { Command, CommandError } from "../command";
import { gamblingService, formatCurrency, parseBet, randomInt } from "../../services/GamblingService";

export const highlowCommand: Command = {
  data: { name: "highlow", description: "Guess whether the next card is higher or lower." },
  cooldownSeconds: 10,
  async execute(message: Message, args: string[]) {
    const bet = parseBet(args[0]);
    const guess = args[1]?.toLowerCase();
    if (guess !== "higher" && guess !== "lower") {
      throw new CommandError("INVALID_GUESS", "Choose **higher** or **lower**. Example: `owo highlow 100 higher`.");
    }
    const current = randomInt(13) + 1;
    const next = randomInt(13) + 1;
    const won = guess === "higher" ? next > current : next < current;
    const payout = won ? (bet * 18n) / 10n : 0n;
    const result = await gamblingService.settleBet(message.author.id, bet, "Highlow", () => ({ payout, result: { current, next, guess } }));
    await message.reply(
      `🃏 Current card: **${current}** → next card: **${next}**\n${won ? `Correct! You won **${formatCurrency(payout)}**.` : "Wrong guess — the house wins."}\nBalance: **${formatCurrency(result.balance)}**`,
    );
  },
};