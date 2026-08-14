import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message } from "discord.js";
import { Command } from "../command";
import { gamblingService, formatCurrency, parseBet, randomInt } from "../../services/GamblingService";
import { GAME_COLORS, formatMultiplier, gameEmbed } from "./ui";

const GRID_SIZE = 9;
const MINE_COUNT = 3;
const MULTIPLIERS = [100n, 140n, 220n, 320n, 460n, 650n, 900n] as const;

function payoutForSafeTiles(bet: bigint, safeTiles: number) {
  const multiplier = MULTIPLIERS[Math.min(safeTiles, MULTIPLIERS.length - 1)];
  return (bet * multiplier) / 100n;
}

function buildGrid(ownerId: string, revealed: Set<number>, mines: Set<number>, finished: boolean, cashout: ButtonBuilder) {
  const gridButtons = Array.from({ length: GRID_SIZE }, (_, index) => {
    const mine = mines.has(index);
    const button = new ButtonBuilder().setCustomId(`mines:tile:${ownerId}:${index}`);
    if (finished || revealed.has(index)) {
      button
        .setLabel(mine ? "💣" : "💎")
        .setStyle(mine ? ButtonStyle.Danger : ButtonStyle.Success)
        .setDisabled(true);
    } else {
      button.setLabel("◆").setStyle(ButtonStyle.Secondary);
    }
    return button;
  });

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let row = 0; row < 3; row += 1) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(gridButtons.slice(row * 3, row * 3 + 3)));
  }
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(cashout));
  return rows.map((row) => row.toJSON());
}

function minesEmbed(
  bet: bigint,
  safeTiles: number,
  color: number,
  title: string,
  description: string,
) {
  const payout = payoutForSafeTiles(bet, safeTiles);
  const embed = gameEmbed(title, color, description);
  embed.addFields(
    { name: "Bet", value: `💵 ${formatCurrency(bet)}`, inline: true },
    { name: "Mines", value: `💣 ${MINE_COUNT}`, inline: true },
    { name: "Winnings", value: `💰 ${formatCurrency(payout)} (${formatMultiplier(payout, bet)})`, inline: true },
    { name: "Next", value: `💎 ${formatCurrency(payoutForSafeTiles(bet, safeTiles + 1))}`, inline: true },
  );
  return embed;
}

export const minesCommand: Command = {
  data: { name: "mines", description: "Avoid mines, then cash out your winnings." },
  cooldownSeconds: 10,
  async execute(message: Message, args: string[]) {
    const bet = parseBet(args[0]);
    const debited = await gamblingService.debitBet(message.author.id, bet, "Mines");
    const mines = new Set<number>();
    while (mines.size < MINE_COUNT) mines.add(randomInt(GRID_SIZE));
    const revealed = new Set<number>();
    let settled = false;
    let processing = false;

    const cashout = new ButtonBuilder()
      .setCustomId(`mines:cashout:${message.author.id}`)
      .setLabel("Cash Out")
      .setEmoji("💵")
      .setStyle(ButtonStyle.Success);
    const initialGrid = buildGrid(message.author.id, revealed, mines, false, cashout);
    const gameMessage = await message.reply({
      embeds: [
        minesEmbed(
          bet,
          0,
          GAME_COLORS.blue,
          `💎 ${message.author} started a Mines game`,
          "Pick a tile to reveal a diamond. Cash out before you uncover a bomb.",
        ).toJSON(),
      ],
      components: initialGrid,
    });
    const collector = gameMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    const finish = async (payout: bigint, title: string, description: string, color: number) => {
      settled = true;
      collector.stop();
      const balance = await gamblingService.creditPayout(debited.userId, payout, "Mines");
      const embed = minesEmbed(bet, revealed.size, color, title, description);
      embed.addFields({ name: "Balance", value: `🪙 ${formatCurrency(balance)}`, inline: true });
      await gameMessage.edit({ embeds: [embed.toJSON()], components: buildGrid(message.author.id, revealed, mines, true, cashout) });
    };

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({ content: "This is not your Mines game.", ephemeral: true });
        return;
      }
      if (settled || processing) return;
      processing = true;
      await interaction.deferUpdate();

      if (interaction.customId.includes(":cashout:")) {
        const payout = payoutForSafeTiles(bet, revealed.size);
        await finish(payout, "💎 Mines — cashed out!", `💵 You cashed out after **${revealed.size} safe tile${revealed.size === 1 ? "" : "s"}**.`, GAME_COLORS.green);
        processing = false;
        return;
      }

      const tile = Number(interaction.customId.split(":").pop());
      if (!Number.isInteger(tile) || tile < 0 || tile >= GRID_SIZE || revealed.has(tile)) {
        processing = false;
        return;
      }
      if (mines.has(tile)) {
        await finish(0n, "💥 Mines — boom!", `A bomb got you. Your **${formatCurrency(bet)}** bet was lost.`, GAME_COLORS.red);
        processing = false;
        return;
      }

      revealed.add(tile);
      if (revealed.size === GRID_SIZE - MINE_COUNT) {
        await finish(
          payoutForSafeTiles(bet, revealed.size),
          "💎 Mines — perfect board!",
          `✨ You found every safe tile and won **${formatCurrency(payoutForSafeTiles(bet, revealed.size))}**.`,
          GAME_COLORS.green,
        );
        processing = false;
        return;
      }

      const embed = minesEmbed(
        bet,
        revealed.size,
        GAME_COLORS.blue,
        `💎 ${message.author}'s Mines game`,
        "Keep picking safe tiles or cash out while the winnings are yours.",
      );
      await gameMessage.edit({ embeds: [embed.toJSON()], components: buildGrid(message.author.id, revealed, mines, false, cashout) });
      processing = false;
    });

    collector.on("end", async () => {
      if (!settled) {
        settled = true;
        await gameMessage
          .edit({
            embeds: [minesEmbed(bet, revealed.size, GAME_COLORS.red, "⌛ Mines — timed out", `Your active **${formatCurrency(bet)}** bet was forfeited.`).toJSON()],
            components: buildGrid(message.author.id, revealed, mines, true, cashout),
          })
          .catch(() => undefined);
      }
    });
  },
};