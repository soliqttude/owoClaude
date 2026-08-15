import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message } from "discord.js";
import { Command } from "../command";
import { gamblingService, formatCurrency, parseBet, randomInt } from "../../services/GamblingService";
import { GAME_COLORS, cardLabel, formatMultiplier, gameEmbed } from "./ui";

type Guess = "higher" | "lower" | "same";

const MAX_STREAK = 7;

function payoutForGuess(bet: bigint, streak: number, guess: Guess) {
  const multiplier = guess === "same" ? BigInt(10 + streak) : BigInt(2 + streak);
  return bet * multiplier;
}

function cashoutForStreak(bet: bigint, streak: number) {
  return streak === 0 ? 0n : bet * BigInt(1 + streak);
}

function cardEmoji(value: number) {
  if (value === 1) return "🅰️";
  if (value === 11) return "🇯";
  if (value === 12) return "🇶";
  if (value === 13) return "🇰";
  return `${value}️⃣`;
}

function highlowEmbed(
  bet: bigint,
  current: number,
  streak: number,
  color: number,
  title: string,
  description: string,
) {
  const cashout = cashoutForStreak(bet, streak);
  const embed = gameEmbed(title, color, description);
  embed.addFields(
    { name: "Bet", value: `💵 ${formatCurrency(bet)}`, inline: true },
    { name: "Streak", value: `🔥 ${streak}`, inline: true },
    { name: "Cash Out", value: `💰 ${formatCurrency(cashout)} (${formatMultiplier(cashout, bet)})`, inline: true },
    {
      name: "Next card",
      value: `${cardEmoji(current)} \`${cardLabel(current)}\`  ➜  🂠`,
      inline: false,
    },
    { name: "Current card value", value: String(current), inline: true },
    { name: "Next win", value: `💎 ${formatCurrency(payoutForGuess(bet, streak, "higher"))}`, inline: true },
  );
  return embed;
}

function highlowRows(ownerId: string, bet: bigint, streak: number, disabled = false) {
  const higher = new ButtonBuilder()
    .setCustomId(`highlow:higher:${ownerId}`)
    .setLabel(`Higher (+${formatCurrency(payoutForGuess(bet, streak, "higher") - bet)})`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(disabled);
  const lower = new ButtonBuilder()
    .setCustomId(`highlow:lower:${ownerId}`)
    .setLabel(`Lower (+${formatCurrency(payoutForGuess(bet, streak, "lower") - bet)})`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(disabled);
  const same = new ButtonBuilder()
    .setCustomId(`highlow:same:${ownerId}`)
    .setLabel(`Same (+${formatCurrency(payoutForGuess(bet, streak, "same") - bet)})`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(disabled);
  const cashout = new ButtonBuilder()
    .setCustomId(`highlow:cashout:${ownerId}`)
    .setLabel("Cash Out")
    .setEmoji("💵")
    .setStyle(ButtonStyle.Success)
    .setDisabled(disabled || streak === 0);
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(higher, lower, same),
    new ActionRowBuilder<ButtonBuilder>().addComponents(cashout),
  ].map((row) => row.toJSON());
}

export const highlowCommand: Command = {
  data: { name: "highlow", description: "Guess whether the next card is higher, lower, or the same." },
  cooldownSeconds: 10,
  async execute(message: Message, args: string[]) {
    const bet = parseBet(args[0]);
    const debited = await gamblingService.debitBet(message.author.id, bet, "Highlow");
    let current = randomInt(13) + 1;
    let streak = 0;
    let settled = false;
    let processing = false;

    const gameMessage = await message.reply({
      embeds: [
        highlowEmbed(
          bet,
          current,
          streak,
          GAME_COLORS.blue,
          `🃏 ${message.author} started a HighLow game`,
          "Is the next card higher, lower, or the same? Build a streak, then cash out.",
        ).toJSON(),
      ],
      components: highlowRows(message.author.id, bet, streak),
    });
    const collector = gameMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    const finish = async (payout: bigint, title: string, description: string, color: number) => {
      settled = true;
      collector.stop();
      const balance = await gamblingService.creditPayout(debited.userId, payout, "Highlow");
      const embed = highlowEmbed(bet, current, streak, color, title, description);
      embed.addFields({ name: "Balance", value: `🪙 ${formatCurrency(balance)}`, inline: true });
      await gameMessage.edit({ embeds: [embed.toJSON()], components: highlowRows(message.author.id, bet, streak, true) });
    };

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({ content: "This is not your HighLow game.", ephemeral: true });
        return;
      }
      if (settled || processing) return;
      processing = true;
      await interaction.deferUpdate();

      const action = interaction.customId.split(":")[1] as Guess | "cashout";
      if (action === "cashout") {
        await finish(
          cashoutForStreak(bet, streak),
          "🃏 HighLow — cashed out!",
          `💵 You locked in your **${streak}-win streak**.`,
          GAME_COLORS.green,
        );
        processing = false;
        return;
      }

      const next = randomInt(13) + 1;
      const won = action === "same" ? next === current : action === "higher" ? next > current : next < current;
      if (!won) {
        await finish(
          0n,
          "💥 HighLow — incorrect!",
          `You guessed **${action}**, but the next card was **${cardLabel(next)}**. Your active bet was lost.`,
          GAME_COLORS.red,
        );
        processing = false;
        return;
      }

      current = next;
      streak += 1;
      if (streak >= MAX_STREAK) {
        await finish(
          cashoutForStreak(bet, streak),
          "🔥 HighLow — max streak!",
          `✨ You reached the **${MAX_STREAK}-win streak** and won **${formatCurrency(cashoutForStreak(bet, streak))}**.`,
          GAME_COLORS.green,
        );
        processing = false;
        return;
      }

      const embed = highlowEmbed(
        bet,
        current,
        streak,
        GAME_COLORS.blue,
        `🃏 ${message.author}'s HighLow game`,
        `✅ Correct! You are on a **${streak}-win streak**. Keep going or cash out.`,
      );
      await gameMessage.edit({ embeds: [embed.toJSON()], components: highlowRows(message.author.id, bet, streak) });
      processing = false;
    });

    collector.on("end", async () => {
      if (!settled) {
        settled = true;
        await gameMessage
          .edit({
            embeds: [highlowEmbed(bet, current, streak, GAME_COLORS.red, "⌛ HighLow — timed out", `Your active **${formatCurrency(bet)}** bet was forfeited.`).toJSON()],
            components: highlowRows(message.author.id, bet, streak, true),
          })
          .catch(() => undefined);
      }
    });
  },
};