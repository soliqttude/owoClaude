import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./command";
import { prisma, ensureUser, createLedgerEntry, lockUserById } from "../prisma";
import { parseBigInt } from "./utils";

export const giveCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("give")
    .setDescription("Give cowoncy to another user.")
    .addUserOption((option) => option.setName("target").setDescription("Who to give cowoncy to").setRequired(true))
    .addIntegerOption((option) => option.setName("amount").setDescription("Amount to give").setRequired(true).setMinValue(1)),
  cooldownSeconds: 10,
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("target", true);
    const amount = BigInt(interaction.options.getInteger("amount", true));
    if (target.id === interaction.user.id) {
      await interaction.reply({ content: "You cannot give cowoncy to yourself.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const giver = await ensureUser(interaction.user.id);
    const receiver = await ensureUser(target.id);

    await prisma.$transaction(async (tx) => {
      const lockedGiver = await lockUserById(tx, giver.id);
      const lockedReceiver = await lockUserById(tx, receiver.id);
      if (!lockedGiver || !lockedReceiver) throw new Error("Unable to lock users.");

      const giverBalance = parseBigInt(lockedGiver.cowoncy);
      if (giverBalance < amount) {
        throw new Error("INSUFFICIENT_FUNDS");
      }

      const receiverBalance = parseBigInt(lockedReceiver.cowoncy);
      const newGiverBalance = giverBalance - amount;
      const newReceiverBalance = receiverBalance + amount;

      await tx.user.update({ where: { id: giver.id }, data: { cowoncy: newGiverBalance } });
      await tx.user.update({ where: { id: receiver.id }, data: { cowoncy: newReceiverBalance } });

      await createLedgerEntry(tx, giver.id, -amount, `Gave ${amount} cowoncy to ${target.tag}`, "TRANSFER", giverBalance, newGiverBalance);
      await createLedgerEntry(tx, receiver.id, amount, `Received ${amount} cowoncy from ${interaction.user.tag}`, "TRANSFER", receiverBalance, newReceiverBalance);
    });

    await interaction.editReply(`Sent ${amount} cowoncy to ${target.tag}.`);
  },
};
