import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Message } from "discord.js";
import { Command } from "../command";
import { gamblingService, formatCurrency, parseBet, randomInt } from "../../services/GamblingService";

interface Card {
  rank: string;
  value: number;
}

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

function drawCard(): Card {
  const rank = RANKS[randomInt(RANKS.length)];
  return { rank, value: rank === "A" ? 11 : ["J", "Q", "K"].includes(rank) ? 10 : Number(rank) };
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
  return hand.map((card) => card.rank).join(" ");
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
      await message.reply(`${text}\nBalance: **${formatCurrency(balance)}**`);
    };

    if (handValue(player) === 21) {
      await finish((bet * 9n) / 4n, `🃏 Blackjack! You had **${displayHand(player)}** and the dealer had **${displayHand(dealer)}**.`);
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`blackjack:hit:${message.author.id}`).setLabel("Hit").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`blackjack:stand:${message.author.id}`).setLabel("Stand").setStyle(ButtonStyle.Secondary),
    );
    const gameMessage = await message.reply({
      content: `🃏 **Blackjack**\nYour hand: **${displayHand(player)}** (${handValue(player)})\nDealer shows: **${dealer[0].rank} ?**`,
      components: [row],
    });
    const collector = gameMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
    let settled = false;

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({ content: "This is not your blackjack game.", ephemeral: true });
        return;
      }
      if (settled) return;
      await interaction.deferUpdate();

      if (interaction.customId.includes(":hit:")) {
        player.push(drawCard());
        const value = handValue(player);
        if (value >= 21) {
          settled = true;
          collector.stop();
          if (value > 21) {
            await interaction.editReply({ content: `🃏 You busted with **${displayHand(player)}** (${value}).`, components: [] });
            return;
          }
        } else {
          await interaction.editReply({
            content: `🃏 **Blackjack**\nYour hand: **${displayHand(player)}** (${value})\nDealer shows: **${dealer[0].rank} ?**`,
            components: [row],
          });
          return;
        }
      }

      while (handValue(dealer) < 17) dealer.push(drawCard());
      const playerValue = handValue(player);
      const dealerValue = handValue(dealer);
      settled = true;
      collector.stop();
      const payout = playerValue > 21 ? 0n : dealerValue > 21 || playerValue > dealerValue ? bet * 2n : playerValue === dealerValue ? bet : 0n;
      const text = playerValue > 21
        ? `🃏 You busted with **${displayHand(player)}** (${playerValue}).`
        : `🃏 You had **${displayHand(player)}** (${playerValue}); dealer had **${displayHand(dealer)}** (${dealerValue}).\n${payout > bet ? `You won **${formatCurrency(payout)}**!` : payout === bet ? "Push — your bet is returned." : "The dealer wins."}`;
      const balance = await gamblingService.creditPayout(debited.userId, payout, "Blackjack");
      await interaction.editReply({ content: `${text}\nBalance: **${formatCurrency(balance)}**`, components: [] });
    });

    collector.on("end", async () => {
      if (!settled) {
        settled = true;
        await gameMessage.edit({ content: "🃏 Blackjack timed out. Your bet was forfeited.", components: [] }).catch(() => undefined);
      }
    });
  },
};