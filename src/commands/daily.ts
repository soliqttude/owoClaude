import { Message } from "discord.js";
import { Command } from "./command";
import { prisma, ensureUser, createLedgerEntry, lockUserById } from "../prisma";
import { parseBigInt } from "./utils";

const DAILY_REWARD = 500n;
const DAY_MS = 24 * 60 * 60 * 1000;

function utcDayKey(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export const dailyCommand: Command = {
  data: { name: "daily", description: "Claim your daily cowoncy reward." },
  cooldownSeconds: 0,
  async execute(message: Message) {
    const user = await ensureUser(message.author.id);
    const result = await prisma.$transaction(async (tx) => {
      const lockedUser = await lockUserById(tx, user.id);
      if (!lockedUser) throw new Error("Unable to lock user account.");

      const now = new Date();
      const lastClaimAt = lockedUser.dailyClaimAt ? new Date(lockedUser.dailyClaimAt) : null;
      if (lastClaimAt && utcDayKey(now) === utcDayKey(lastClaimAt)) {
        const nextUtcMidnight = utcDayKey(now) + DAY_MS;
        return { claimed: false, secondsUntilReady: Math.max(1, Math.ceil((nextUtcMidnight - now.getTime()) / 1000)) };
      }

      const previousDay = utcDayKey(now) - DAY_MS;
      const newStreak = lastClaimAt && utcDayKey(lastClaimAt) === previousDay
        ? Number(lockedUser.dailyStreak ?? 0) + 1
        : 1;
      const reward = DAILY_REWARD + BigInt(newStreak) * 50n;
      const balanceBefore = parseBigInt(lockedUser.cowoncy);
      const balanceAfter = balanceBefore + reward;
      const gotLootbox = Math.random() < 0.25;

      await tx.user.update({
        where: { id: user.id },
        data: {
          cowoncy: balanceAfter,
          dailyClaimAt: now,
          dailyStreak: newStreak,
          lootboxes: Number(lockedUser.lootboxes ?? 0) + (gotLootbox ? 1 : 0),
        },
      });
      await createLedgerEntry(tx, user.id, reward, "Daily reward claimed", "DAILY", balanceBefore, balanceAfter);
      return { claimed: true, reward, balanceAfter, newStreak, gotLootbox };
    });

    if (!result.claimed) {
      const secondsUntilReady = result.secondsUntilReady ?? 0;
      const hours = Math.floor(secondsUntilReady / 3600);
      const minutes = Math.floor((secondsUntilReady % 3600) / 60);
      const seconds = secondsUntilReady % 60;
      await message.reply(`Your next daily is in **${hours}H ${minutes}M ${seconds}S**.`);
      return;
    }

    await message.reply(
      `💰 ${message.member?.displayName ?? message.author.username}, you received **${result.reward?.toLocaleString() ?? "0"} cowoncy**!\n` +
      `Daily streak: **${result.newStreak ?? 0}**\nBalance: **${result.balanceAfter?.toLocaleString() ?? "0"}**` +
      (result.gotLootbox ? "\nYou also received a lootbox!" : ""),
    );
  },
};