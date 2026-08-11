import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "./command";
import { ensureUser, prisma } from "../prisma";

export const inventoryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("View your inventory."),
  cooldownSeconds: 0,
  async execute(interaction: ChatInputCommandInteraction) {
    // Showing publicly like the screenshot
    await interaction.deferReply({ ephemeral: false });

    const user = await ensureUser(interaction.user.id);
    const inventory = await prisma.inventory.findUnique({ 
      where: { userId: user.id } 
    });

    // Parse the items JSON
    const items = (inventory?.items as Record<string, number>) ?? {};

    // 1. Check if the inventory is empty
    const entries = Object.entries(items).filter(([, count]) => count > 0);
    
    if (entries.length === 0) {
      await interaction.editReply(`📭 | ${interaction.user.username}, your inventory is completely empty!`);
      return;
    }

    // 2. Build the Grid (4 columns, matching the screenshot)
    const COLS = 4;
    let gridRows: string[] = [];
    
    // Sort entries by numeric ID so it looks organized
    entries.sort(([idA], [idB]) => parseInt(idA) - parseInt(idB));

    // Chunk the entries into groups of 4 (the rows)
    for (let i = 0; i < entries.length; i += COLS) {
      const chunk = entries.slice(i, i + COLS);
      const rowString = chunk.map(([id, count]) => {
        // Format: `001` ❓ 5
        // Using backticks ` ` for the grey box, and ❓ as a placeholder emoji
        return `\`${id}\` ❓ ${count}`; 
      }).join("  "); // Double space between columns to mimic the gap
      
      gridRows.push(rowString);
    }

    // 3. Build the final content string
    const title = `====== ${interaction.user.username}'s Inventory ======`;
    const body = gridRows.join("\n");

    // 4. Send the reply
    await interaction.editReply({
      content: `${title}\n\n${body}`
    });
  },
};