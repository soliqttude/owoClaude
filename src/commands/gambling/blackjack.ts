import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message } from "discord.js";
import { Command } from "../command";
import { gamblingService, formatCurrency, parseBet, randomInt } from "../../services/GamblingService";
import { GAME_COLORS, gameEmbed } from "./ui";

interface Card {
  rank: string;
  suit: string;
  value: number;
}

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
const SUITS = ["♠", "♥", "♦", "♣"] as const;

function drawCard(): Card {
  const rank = RANKS[randomInt(RANKS.length)];
  return {
    rank,
    suit: SUITS[randomInt(SUITS.length)],
    value: rank === "A" ? 11 : ["J", "Q", "K"].includes(rank) ? 10 : Number(rank),
  };
}

function handValue(hand: Card[]) {
  let value = hand.reduce((sum, card) => sum + card.value, 0);
  let aces = hand.filter((card) => card.rank === "A").length;
  while (value > 21 && aces > 0) {
    value -= 10;
    aces -= 1;
  }
  return value;
}

function displayHand(hand: Card[]) {
  return hand.map((card) => `\`${card.rank}${card.suit}\``).join(" ");
}

function blackjackEmbed(
  player: Card[],
  dealer: Card[],
  showDealer: boolean,
  color: number,
  description?: string,
) {
  const embed = gameEmbed("🃏 BLACKJACK", color, description);
  embed.addFields(
    {
      name: `Dealer [${showDealer ? handValue(dealer) : `${handValue([dealer[0]])}+?`}]`,
      value: showDealer ? displayHand(dealer) : `${displayHand([dealer[0]])} \`🂠\``,
      inline: false,
    },
    {
      name: `Player [${handValue(player)}]`,
      value: displayHand(player),
      inline: false,
    },
  );
  return embed;
}

export const blackjackCommand: Command = {
  data: { name: "blackjack", description: "Play blackjack against the house." },
  cooldownSeconds: 10,
  async execute(message: Message, args: string[]) {
    const bet = parseBet(args[0]);
    const debited = await gamblingService.debitBet(message.author.id, bet, "Blackjack");
    const player = [drawCard(), drawCard()];
    const dealer = [drawCard(), drawCard()];

    const finish = async (payout: bigint, text: string) => {
      const balance = await gamblingService.creditPayout(debited.userId, payout, "Blackjack");
      const embed = blackjackEmbed(player, dealer, true, payout > bet ? GAME_COLORS.green : GAME_COLORS.red, text);
      embed.addFields(
        { name: "Bet", value: `💵 ${formatCurrency(bet)}`, inline: true },
        { name: "Payout", value: `💰 ${formatCurrency(payout)}`, inline: true },
        { name: "Balance", value: `🪙 ${formatCurrency(balance)}`, inline: true },
      );
      await message.reply({ embeds: [embed.toJSON()] });
    };

    if (handValue(player) === 21) {
      await finish((bet * 9n) / 4n, `✨ **Blackjack!** ${message.author} hit 21 on the opening hand.`);
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`blackjack:hit:${message.author.id}`)
        .setLabel("Hit")
        .setEmoji("👊")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`blackjack:stand:${message.author.id}`)
        .setLabel("Stand")
        .setEmoji("🛑")
        .setStyle(ButtonStyle.Secondary),
    );
    const gameMessage = await message.reply({
      embeds: [blackjackEmbed(player, dealer, false, GAME_COLORS.blue, `${message.author} bet **${formatCurrency(bet)}** to play.\n🎲 Choose Hit or Stand.`).toJSON()],
      components: [row.toJSON()],
    });
    const collector = gameMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
    let settled = false;
    let processing = false;

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({ content: "This is not your blackjack game.", ephemeral: true });
        return;
      }
      if (settled || processing) return;
      processing = true;
      await interaction.deferUpdate();

      if (interaction.customId.includes(":hit:")) {
        player.push(drawCard());
        const value = handValue(player);
        if (value < 21) {
          processing = false;
          await interaction.editReply({
            embeds: [blackjackEmbed(player, dealer, false, GAME_COLORS.blue, `🎲 ${message.author} is still in the game.`).toJSON()],
            components: [row.toJSON()],
          });
          return;
        }

        settled = true;
        collector.stop();
        if (value > 21) {
          processing = false;
          const balance = await gamblingService.creditPayout(debited.userId, 0n, "Blackjack");
          const embed = blackjackEmbed(player, dealer, true, GAME_COLORS.red, `💥 You busted with **${value}**. Your **${formatCurrency(bet)}** bet was lost.`);
          embed.addFields({ name: "Balance", value: `🪙 ${formatCurrency(balance)}`, inline: true });
          await interaction.editReply({ embeds: [embed.toJSON()], components: [] });
          return;
        }
      }

      while (handValue(dealer) < 17) dealer.push(drawCard());
      const playerValue = handValue(player);
      const dealerValue = handValue(dealer);
      settled = true;
      collector.stop();
      const payout = dealerValue > 21 || playerValue > dealerValue ? bet * 2n : playerValue === dealerValue ? bet : 0n;
      const text =
        dealerValue > 21
          ? `🎉 Dealer busted with **${dealerValue}**. You win!`
          : playerValue > dealerValue
            ? `🎉 You beat the dealer **${playerValue}** to **${dealerValue}**.`
            : playerValue === dealerValue
              ? "🤝 Push — your bet is returned."
              : `💥 The dealer wins with **${dealerValue}**.`;
      const balance = await gamblingService.creditPayout(debited.userId, payout, "Blackjack");
      processing = false;
      const embed = blackjackEmbed(player, dealer, true, payout >= bet ? GAME_COLORS.green : GAME_COLORS.red, text);
      embed.addFields(
        { name: "Bet", value: `💵 ${formatCurrency(bet)}`, inline: true },
        { name: "Payout", value: `💰 ${formatCurrency(payout)}`, inline: true },
        { name: "Balance", value: `🪙 ${formatCurrency(balance)}`, inline: true },
      );
      await interaction.editReply({ embeds: [embed.toJSON()], components: [] });
    });

    collector.on("end", async () => {
      if (!settled) {
        settled = true;
        await gameMessage
          .edit({
            embeds: [blackjackEmbed(player, dealer, false, GAME_COLORS.red, `⌛ Blackjack timed out. Your **${formatCurrency(bet)}** bet was forfeited.`).toJSON()],
            components: [],
          })
          .catch(() => undefined);
      }
    });
  },
};