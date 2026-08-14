import { Message } from "discord.js";
import { Command } from "../command";
import { gamblingService, formatCurrency, parsePositiveTicketCount } from "../../services/GamblingService";
import { GAME_COLORS, gameEmbed } from "./ui";

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
      const embed = gameEmbed("🎟️ LOTTERY", GAME_COLORS.gold, "Buy tickets and take a chance at the shared cowoncy pool.");
      embed.addFields(
        { name: "Prize pool", value: `💰 ${formatCurrency(status.round.pool)} cowoncy`, inline: true },
        { name: "Tickets sold", value: `🎟️ ${status.totalTickets}`, inline: true },
        { name: "Draws in", value: `⏳ ${hours} hour${hours === 1 ? "" : "s"}`, inline: true },
      );
      if (drawing) embed.setFooter({ text: drawing.trim() });
      await message.reply({ embeds: [embed.toJSON()] });
      return;
    }

    const ticketCount = parsePositiveTicketCount(args[0]);
    const purchase = await gamblingService.buyLotteryTickets(message.author.id, ticketCount);
    const hours = Math.max(0, Math.ceil((purchase.round.closesAt.getTime() - Date.now()) / (60 * 60 * 1000)));
    const drawing = purchase.drawing
      ? `\nPrevious winner: <@${purchase.drawing.winnerDiscordId}> won **${formatCurrency(purchase.drawing.prize)}**.`
      : "";
    const embed = gameEmbed("🎟️ LOTTERY — TICKETS BOUGHT", GAME_COLORS.gold, `You bought **${purchase.ticketCount} ticket${purchase.ticketCount === 1 ? "" : "s"}**.`);
    embed.addFields(
      { name: "Cost", value: `💵 ${formatCurrency(purchase.totalCost)} cowoncy`, inline: true },
      { name: "Prize pool", value: `💰 ${formatCurrency(purchase.round.pool + purchase.totalCost)} cowoncy`, inline: true },
      { name: "Draws in", value: `⏳ ${hours} hour${hours === 1 ? "" : "s"}`, inline: true },
      { name: "Balance", value: `🪙 ${formatCurrency(purchase.balanceAfter)}`, inline: true },
    );
    if (drawing) embed.setFooter({ text: drawing.trim() });
    await message.reply({ embeds: [embed.toJSON()] });
  },
};