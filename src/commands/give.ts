import { Message } from "discord.js";
import { Command, CommandError } from "./command";
import { prisma, ensureUser, createLedgerEntry, lockUserById } from "../prisma";
import { parseBigInt, parsePositiveInteger } from "./utils";

export const giveCommand: Command = {
  data: { name: "give", description: "Give cowoncy to another user." },
  cooldownSeconds: 10,
  async execute(message: Message, args: string[]) {
    const target = message.mentions.users.first();
    const amountIndex = target ? 1 : 0;
    const amount = BigInt(parsePositiveInteger(args[amountIndex], "Amount"));
    if (!target) throw new CommandError("MISSING_USER", "Mention a user to give cowoncy to.");
    if (target.bot) throw new CommandError("INVALID_USER", "You cannot give cowoncy to a bot.");
    if (target.id === message.author.id) throw new CommandError("INVALID_USER", "You cannot give cowoncy to yourself.");

    const giver = await ensureUser(message.author.id);
    const receiver = await ensureUser(target.id);
    await prisma.$transaction(async (tx) => {
      const lockedGiver = await lockUserById(tx, giver.id);
      const lockedReceiver = await lockUserById(tx, receiver.id);
      if (!lockedGiver || !lockedReceiver) throw new Error("Unable to lock users.");

      const giverBalance = parseBigInt(lockedGiver.cowoncy);
      if (giverBalance < amount) {
        throw new CommandError("INSUFFICIENT_FUNDS", `You only have ${giverBalance.toLocaleString()} cowoncy.`);
      }
      const receiverBalance = parseBigInt(lockedReceiver.cowoncy);
      const newGiverBalance = giverBalance - amount;
      const newReceiverBalance = receiverBalance + amount;
      await tx.user.update({ where: { id: giver.id }, data: { cowoncy: newGiverBalance } });
      await tx.user.update({ where: { id: receiver.id }, data: { cowoncy: newReceiverBalance } });
      await createLedgerEntry(tx, giver.id, -amount, `Gave ${amount} cowoncy to ${target.tag}`, "TRANSFER", giverBalance, newGiverBalance);
      await createLedgerEntry(tx, receiver.id, amount, `Received ${amount} cowoncy from ${message.author.tag}`, "TRANSFER", receiverBalance, newReceiverBalance);
    });
    await message.reply(`Sent **${amount.toLocaleString()} cowoncy** to ${target}.`);
  },
};