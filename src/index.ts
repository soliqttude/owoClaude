import { Client, GatewayIntentBits, Collection } from "discord.js";
import { config } from "dotenv";
import { Command } from "./commands/command"; // Import your new interface

// Import your actual commands
import { cowoncyCommand } from "./commands/cowoncy";
import { dailyCommand } from "./commands/daily";
import { inventoryCommand } from "./commands/inventory";

config(); // Load .env variables

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent // REQUIRED for prefix bots
    ] 
});

// Define a Collection that strictly holds your Command type
const commands = new Collection<string, Command>();
commands.set(cowoncyCommand.data.name, cowoncyCommand);
commands.set(dailyCommand.data.name, dailyCommand);
commands.set(inventoryCommand.data.name, inventoryCommand);

const PREFIX = "owo";

client.on('messageCreate', async (message) => {
    // Ignore bots and empty messages
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    // Split the message into command and args
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    // Check if the command exists
    const command = commands.get(commandName);
    if (!command) return;

    try {
        // Execute the command
        await command.execute(message, args);
    } catch (error) {
        console.error(error);
        await message.reply("There was an error executing that command!");
    }
});

client.login(process.env.DISCORD_TOKEN);