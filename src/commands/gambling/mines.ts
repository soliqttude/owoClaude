import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message } from "discord.js";
import { Command } from "../command";
import { gamblingService, formatCurrency, parseBet, randomInt } from "../../services/GamblingService";

const GRID_SIZE = 24;
const MINE_COUNT = 5;

function gridRows(ownerId: string, revealed: Set<number>, mines: Set<number>, finished: boolean, cashout?: ButtonBuilder) {
  const buttons: ButtonBuilder[] = [];
  for (let index = 0; index < GRID_SIZE; index += 1) {
    const isMine = mines.has(index);
    const button = new ButtonBuilder().setCustomId(`mines:tile:${ownerId}:${index}`);
    if (revealed.has(index) || finished) {
      button.setLabel(isMine ? "💣" : "◆").setStyle(isMine ? ButtonStyle.Danger : ButtonStyle.Success).setDisabled(true);
    } else {
      button.setLabel("·").setStyle(ButtonStyle.Secondary);
    }
    buttons.push(button);
  }
  if (cashout) buttons.push(cashout);
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let row = 0; row < Math.ceil(buttons.length / 5); row += 1) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(row * 5, row * 5 + 5)));
  }
  return rows;
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

    const cashout = new ButtonBuilder()
      .setCustomId(`mines:cashout:${message.author.id}`)
      .setLabel("Cash out")
      .setStyle(ButtonStyle.Success);
    const gameMessage = await message.reply({
      content: `💣 **Mines**\nFind safe tiles and cash out before you hit a mine.\nBet: **${formatCurrency(bet)}** | Safe tiles: **0**`,
      components: gridRows(message.author.id, revealed, mines, false, cashout),
    });
    const collector = gameMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    const finish = async (payout: bigint, content: string) => {
      settled = true;
      collector.stop();
      const balance = await gamblingService.creditPayout(debited.userId, payout, "Mines");
      await gameMessage.edit({ content: `${content}\nBalance: **${formatCurrency(balance)}**`, components: gridRows(message.author.id, revealed, mines, true) });
    };

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({ content: "This is not your mines game.", ephemeral: true });
        return;
      }
      if (settled) return;
      await interaction.deferUpdate();
      if (interaction.customId.includes(":cashout:")) {
        const multiplier = 100n + BigInt(revealed.size) * 18n;
        const payout = (bet * multiplier) / 100n;
        await finish(payout, `💣 You cashed out after **${revealed.size} safe tile${revealed.size === 1 ? "" : "s"}** for **${formatCurrency(payout)}**.`);
        return;
      }

      const tile = Number(interaction.customId.split(":").pop());
      if (revealed.has(tile)) return;
      if (mines.has(tile)) {
        await finish(0n, `💥 Mine hit. You lost your **${formatCurrency(bet)}** bet.`);
        return;
      }
      revealed.add(tile);
      if (revealed.size === GRID_SIZE - MINE_COUNT) {
        await finish(bet * 2n, `💣 Perfect board! You won **${formatCurrency(bet * 2n)}**.`);
        return;
      }
      const multiplier = 100n + BigInt(revealed.size) * 18n;
      const cashoutValue = (bet * multiplier) / 100n;
      await gameMessage.edit({
        content: `💣 **Mines**\nKeep going or cash out for **${formatCurrency(cashoutValue)}**.\nBet: **${formatCurrency(bet)}** | Safe tiles: **${revealed.size}**`,
        components: gridRows(message.author.id, revealed, mines, false, cashout),
      });
    });

    collector.on("end", async () => {
      if (!settled) {
        settled = true;
        await gameMessage.edit({ content: "💣 Mines timed out. Your active bet was forfeited.", components: gridRows(message.author.id, revealed, mines, true) }).catch(() => undefined);
      }
    });
  },
};