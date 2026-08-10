import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { commandMap } from "./commands";
import { checkCooldown, setCooldown } from "./middleware/cooldowns";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  throw new Error("DISCORD_TOKEN is required in .env");
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commandMap.get(interaction.commandName);
  if (!command) return;

  if (command.cooldownSeconds) {
    const remaining = checkCooldown(interaction.user.id, command.data.name);
    if (remaining > 0) {
      await interaction.reply({
        content: `Please wait ${remaining}s before using /${command.data.name} again.`,
        ephemeral: true,
      });
      return;
    }

    setCooldown(interaction.user.id, command.data.name, command.cooldownSeconds);
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error("Command execution error:", error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "Something went wrong while running that command.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "Something went wrong while running that command.",
        ephemeral: true,
      });
    }
  }
});

client.login(token);
