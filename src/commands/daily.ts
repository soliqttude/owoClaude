import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./command";
import { prisma, ensureUser, createLedgerEntry, lockUserById } from "../prisma";
import { parseBigInt } from "./utils";

const DAILY_REWARD = 500n;

export const dailyCommand: Command = {
  data: new SlashCommandBuilder().setName("daily").setDescription("Claim your daily cowoncy reward."),
  cooldownSeconds: 0,
  async execute(interaction: ChatInputCommandInteraction) {
    // Show publicly like the screenshot
    await interaction.deferReply({ ephemeral: false }); 

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

      // Streak and lootbox logic
      let newStreak = (lockedUser.dailyStreak || 0) + 1;
      const streakBonus = BigInt(newStreak) * 50n; // +50 bonus per streak day
      const totalReward = DAILY_REWARD + streakBonus;

      const gotLootbox = Math.random() < 0.25; // 25% chance
      const newLootboxCount = (lockedUser.lootboxes || 0) + (gotLootbox ? 1 : 0);

      const oldBalance = parseBigInt(lockedUser.cowoncy);
      const newBalance = oldBalance + totalReward;

      await tx.user.update({
        where: { id: user.id },
        data: { 
          cowoncy: newBalance, 
          dailyClaimAt: now,
          dailyStreak: newStreak,
          lootboxes: newLootboxCount 
        },
      });

      await createLedgerEntry(tx, user.id, totalReward, "Daily reward claimed", "DAILY", oldBalance, newBalance);
      return { claimed: true, newBalance, totalReward, newStreak, gotLootbox };
    });

    // --- COOLDOWN REPLY ---
    if (!result.claimed) {
      const s = result.secondsUntilReady;
      const hours = Math.floor(s / 3600);
      const minutes = Math.floor((s % 3600) / 60);
      const seconds = s % 60;
      const timeString = `${hours}H ${minutes}M ${seconds}S`;

      await interaction.editReply({
        content: `⏱️ | Your next daily is in: **${timeString}**`
      });
      return;
    }

    // --- SUCCESS REPLY ---
    const formattedCowoncy = result.totalReward.toLocaleString();
    
    // APPLICATION EMOJIS USE A HYPHEN '-', NOT COLONS ':'
    const cowoncyEmoji = `<cowoncy:1536522907012825178>`; 
    const lootboxEmoji = `<box:1536524431290273822>`; // Change "box" to your actual emoji name if needed

    // Build the multi-line message
    let replyLines = [
      `💰 | ${interaction.user.username}, Here is your daily ${cowoncyEmoji}`,
      `**${formattedCowoncy} Cowoncy!**`,
      `│ You're on a **${result.newStreak} daily streak**!`,
    ];

    if (result.gotLootbox) {
      replyLines.push(`${lootboxEmoji} | You received a **lootbox**!`);
    }

    replyLines.push(`⏱️ | Your next daily is in: **24H 0M 0S**`);

    await interaction.editReply({
      content: replyLines.join('\n')
    });
  },
};