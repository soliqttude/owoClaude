import { Client, GatewayIntentBits, Collection } from "discord.js";
import { config } from "dotenv"; // if you use dotenv
// Import your commands
import { cowoncyCommand } from "./commands/cowoncy";
import { dailyCommand } from "./commands/daily";
import { inventoryCommand } from "./commands/inventory";

config(); // Load .env variables

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent // <--- CRITICAL: You MUST enable this intent!
    ] 
});

// Store commands in a collection so we can find them easily
const commands = new Collection();
commands.set(cowoncyCommand.data.name, cowoncyCommand);
commands.set(dailyCommand.data.name, dailyCommand);
commands.set(inventoryCommand.data.name, inventoryCommand);

// --- PREFIX LOGIC HERE ---
const PREFIX = "owo"; // You can change this to "ow o" or "!" if you want

client.on('messageCreate', async (message) => {
    // 1. Ignore bots and empty messages
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    // 2. Split the message into command and args
    // Example: "owo daily 5" -> ["owo", "daily", "5"]
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    // 3. Check if the command exists
    const command = commands.get(commandName);
    if (!command) return;

    try {
        // 4. Run the command
        // We wrap the interaction in a fake object to trick your existing command code
        // But it's better to convert your commands to use message, so I'll give you the updated files below.
        await command.execute(message, args);
    } catch (error) {
        console.error(error);
        await message.reply("There was an error executing that command!");
    }
});

client.login(process.env.DISCORD_TOKEN);