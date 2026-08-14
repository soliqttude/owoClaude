import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message } from "discord.js";
import { Command } from "../command";
import { gamblingService, formatCurrency, parseBet } from "../../services/GamblingService";
import { GAME_COLORS, formatMultiplier, gameEmbed } from "./ui";

const MAX_STEPS = 10;
const FAILURE_CHANCE = 20;
const STEP_REWARD = 8n;

function cashoutForSteps(bet: bigint, steps: number) {
  return steps === 0 ? 0n : bet + BigInt(steps) * STEP_REWARD;
}

function gardenRows(ownerId: string, steps: number, finished: boolean, plant: ButtonBuilder, cashout: ButtonBuilder) {
  const plots = Array.from({ length: MAX_STEPS }, (_, index) => {
    const planted = index < steps;
    return new ButtonBuilder()
      .setCustomId(`snailgarden:plot:${ownerId}:${index}`)
      .setLabel(planted ? "🌱" : "🟩")
      .setStyle(planted ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(true);
  });
  const rows: ActionRowBuilder<ButtonBuilder>[] = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(plots.slice(0, 5)),
    new ActionRowBuilder<ButtonBuilder>().addComponents(plots.slice(5)),
  ];
  rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(plant, cashout));
  if (finished) {
    rows[2] = new ActionRowBuilder<ButtonBuilder>().addComponents(
      plant.setDisabled(true),
      cashout.setDisabled(true),
    );
  }
  return rows.map((row) => row.toJSON());
}

function snailEmbed(
  bet: bigint,
  steps: number,
  color: number,
  title: string,
  description: string,
) {
  const cashout = cashoutForSteps(bet, steps);
  const embed = gameEmbed(title, color, description);
  embed.addFields(
    { name: "Bet", value: `💵 ${formatCurrency(bet)}`, inline: true },
    { name: "Steps", value: `🌱 ${steps}/${MAX_STEPS}`, inline: true },
    { name: "Failure Chance", value: `⚠️ ${FAILURE_CHANCE}%`, inline: true },
    { name: "Cash Out", value: `💰 ${formatCurrency(cashout)} (${formatMultiplier(cashout, bet)})`, inline: true },
    { name: "Next", value: `🌻 ${formatCurrency(cashoutForSteps(bet, steps + 1))} (${formatMultiplier(cashoutForSteps(bet, steps + 1), bet)})`, inline: true },
  );
  return embed;
}

export const snailgardenCommand: Command = {
  data: { name: "snailgarden", description: "Plant a garden, survive the chicken, and cash out." },
  cooldownSeconds: 10,
  async execute(message: Message, args: string[]) {
    const bet = parseBet(args[0]);
    const debited = await gamblingService.debitBet(message.author.id, bet, "Snailgarden");
    let steps = 0;
    let settled = false;
    let processing = false;

    const plant = new ButtonBuilder()
      .setCustomId(`snailgarden:plant:${message.author.id}`)
      .setLabel("Plant")
      .setEmoji("🌻")
      .setStyle(ButtonStyle.Primary);
    const cashout = new ButtonBuilder()
      .setCustomId(`snailgarden:cashout:${message.author.id}`)
      .setLabel("Cash Out")
      .setEmoji("💵")
      .setStyle(ButtonStyle.Success)
      .setDisabled(true);

    const gameMessage = await message.reply({
      embeds: [
        snailEmbed(
          bet,
          steps,
          GAME_COLORS.blue,
          `🐌 ${message.author} is planting a garden`,
          "Grow your garden one step at a time. The chicken has a 20% chance to eat your snail on every plant.",
        ).toJSON(),
      ],
      components: gardenRows(message.author.id, steps, false, plant, cashout),
    });
    const collector = gameMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    const finish = async (payout: bigint, title: string, description: string, color: number) => {
      settled = true;
      collector.stop();
      const balance = await gamblingService.creditPayout(debited.userId, payout, "Snailgarden");
      const embed = snailEmbed(bet, steps, color, title, description);
      embed.addFields({ name: "Balance", value: `🪙 ${formatCurrency(balance)}`, inline: true });
      await gameMessage.edit({ embeds: [embed.toJSON()], components: gardenRows(message.author.id, steps, true, plant, cashout) });
    };

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({ content: "This is not your Snailgarden game.", ephemeral: true });
        return;
      }
      if (settled || processing) return;
      processing = true;
      await interaction.deferUpdate();

      const action = interaction.customId.split(":")[1];
      if (action === "cashout") {
        await finish(
          cashoutForSteps(bet, steps),
          "🐌 Snailgarden — cashed out!",
          `💵 You protected your snail after **${steps} step${steps === 1 ? "" : "s"}**.`,
          GAME_COLORS.green,
        );
        processing = false;
        return;
      }

      if (Math.random() * 100 < FAILURE_CHANCE) {
        await finish(0n, "💥 Snailgarden — your snail got eaten!", "🐔 The chicken found your garden. Your active bet was lost.", GAME_COLORS.red);
        processing = false;
        return;
      }

      steps += 1;
      if (steps >= MAX_STEPS) {
        await finish(
          cashoutForSteps(bet, steps),
          "🌻 Snailgarden — garden complete!",
          `✨ Your snail grew all **${MAX_STEPS} steps** and won **${formatCurrency(cashoutForSteps(bet, steps))}**.`,
          GAME_COLORS.green,
        );
        processing = false;
        return;
      }

      cashout.setDisabled(false);
      const embed = snailEmbed(
        bet,
        steps,
        GAME_COLORS.blue,
        `🐌 ${message.author}'s snail is planting`,
        `🌱 The garden grew! You are on step **${steps}**. Plant again or cash out.`,
      );
      await gameMessage.edit({ embeds: [embed.toJSON()], components: gardenRows(message.author.id, steps, false, plant, cashout) });
      processing = false;
    });

    collector.on("end", async () => {
      if (!settled) {
        settled = true;
        await gameMessage
          .edit({
            embeds: [snailEmbed(bet, steps, GAME_COLORS.red, "⌛ Snailgarden — timed out", `Your active **${formatCurrency(bet)}** bet was forfeited.`).toJSON()],
            components: gardenRows(message.author.id, steps, true, plant, cashout),
          })
          .catch(() => undefined);
      }
    });
  },
};