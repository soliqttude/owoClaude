import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./command";
import { prisma, ensureUser, createLedgerEntry, lockUserById } from "../prisma";
import { parseBigInt } from "./utils";

const DAILY_REWARD = 500n;

export const dailyCommand: Command = {
  data: new SlashCommandBuilder().setName("daily").setDescription("Claim your daily cowoncy reward."),
  cooldownSeconds: 0,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const user = await ensureUser(interaction.user.id);

    const result = await prisma.$transaction(async (tx) => {
      const lockedUser = await lockUserById(tx, user.id);
      if (!lockedUser) throw new Error("Unable to lock user account.");

      const lastClaimAt = lockedUser.dailyClaimAt ? new Date(lockedUser.dailyClaimAt) : null;
      const now = new Date();
      if (lastClaimAt) {
        const diff = now.getTime() - lastClaimAt.getTime();
        const secondsUntilReady = 24 * 60 * 60 - Math.floor(diff / 1000);
        if (secondsUntilReady > 0) {
          return { claimed: false, secondsUntilReady };
        }
      }

      const oldBalance = parseBigInt(lockedUser.cowoncy);
      const newBalance = oldBalance + DAILY_REWARD;

      await tx.user.update({
        where: { id: user.id },
        data: { cowoncy: newBalance, dailyClaimAt: now },
      });

      await createLedgerEntry(tx, user.id, DAILY_REWARD, "Daily reward claimed", "DAILY", oldBalance, newBalance);
      return { claimed: true, newBalance };
    });

    if (!result.claimed) {
      await interaction.editReply(`You already claimed daily. Try again in ${result.secondsUntilReady}s.`);
      return;
    }

    await interaction.editReply(`Daily claimed! +${DAILY_REWARD} cowoncy. Balance: ${result.newBalance}`);
  },
};
