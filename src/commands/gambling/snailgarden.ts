import { Message } from "discord.js";
import { Command, CommandError } from "../command";
import { gamblingService, formatCurrency, parseBet, pick } from "../../services/GamblingService";

const SNAILS = ["Moss", "Turbo", "Pebble", "Noodle", "Sprout", "Shellby"] as const;

export const snailgardenCommand: Command = {
  data: { name: "snailgarden", description: "Grow a snail and bet on the garden race." },
  cooldownSeconds: 10,
  async execute(message: Message, args: string[]) {
    const bet = parseBet(args[0]);
    const chosen = args[1]?.toLowerCase();
    const snail = SNAILS.find((candidate) => candidate.toLowerCase() === chosen);
    if (!snail) {
      throw new CommandError("INVALID_SNAIL", `Choose a snail: ${SNAILS.join(", ")}. Example: \`owo snailgarden 100 moss\`.`);
    }

    const racers = [...SNAILS].sort(() => Math.random() - 0.5);
    const winner = pick(racers);
    const won = winner === snail;
    const payout = won ? (bet * 5n) / 2n : 0n;
    const result = await gamblingService.settleBet(message.author.id, bet, "Snailgarden", () => ({ payout, result: { racers, winner, snail } }));
    await message.reply(
      `🐌 **Snailgarden race**\n${racers.map((racer, index) => `${index + 1}. ${racer}`).join("  ")}\n` +
      `Your snail: **${snail}** | Winner: **${winner}**\n` +
      `${won ? `Your snail won! Payout: **${formatCurrency(payout)}**.` : "Your snail got shelled. The house wins."}\nBalance: **${formatCurrency(result.balance)}**`,
    );
  },
};