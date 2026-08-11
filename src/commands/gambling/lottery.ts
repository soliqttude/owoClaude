import { Message } from "discord.js";
import { Command } from "../command";
import { gamblingService, formatCurrency, parsePositiveTicketCount } from "../../services/GamblingService";

export const lotteryCommand: Command = {
  data: { name: "lottery", description: "Buy lottery tickets or check the current prize pool." },
  cooldownSeconds: 10,
  async execute(message: Message, args: string[]) {
    if (args[0]?.toLowerCase() === "status" || args.length === 0) {
      const status = await gamblingService.lotteryStatus();
      const hours = Math.max(0, Math.ceil((status.round.closesAt.getTime() - Date.now()) / (60 * 60 * 1000)));
      const drawing = status.drawing
        ? `\nPrevious winner: <@${status.drawing.winnerDiscordId}> won **${formatCurrency(status.drawing.prize)}**.`
        : "";
      await message.reply(
        `🎟️ **Lottery**\nPool: **${formatCurrency(status.round.pool)}** cowoncy\nTickets sold: **${status.totalTickets}**\nDraws in approximately **${hours} hour${hours === 1 ? "" : "s"}**.${drawing}`,
      );
      return;
    }

    const ticketCount = parsePositiveTicketCount(args[0]);
    const purchase = await gamblingService.buyLotteryTickets(message.author.id, ticketCount);
    const hours = Math.max(0, Math.ceil((purchase.round.closesAt.getTime() - Date.now()) / (60 * 60 * 1000)));
    const drawing = purchase.drawing
      ? `\nPrevious winner: <@${purchase.drawing.winnerDiscordId}> won **${formatCurrency(purchase.drawing.prize)}**.`
      : "";
    await message.reply(
      `🎟️ Bought **${purchase.ticketCount} ticket${purchase.ticketCount === 1 ? "" : "s"}** for **${formatCurrency(purchase.totalCost)}** cowoncy.\n` +
      `Pool: **${formatCurrency(purchase.round.pool + purchase.totalCost)}** cowoncy\n` +
      `Draws in approximately **${hours} hour${hours === 1 ? "" : "s"}**.\nBalance: **${formatCurrency(purchase.balanceAfter)}**${drawing}`,
    );
  },
};