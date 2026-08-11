import { Client, GatewayIntentBits, Collection } from "discord.js";
import { config } from "dotenv";
import { Command } from "./commands/command";

import { cowoncyCommand } from "./commands/cowoncy";
import { dailyCommand } from "./commands/daily";
import { inventoryCommand } from "./commands/inventory";
import { giveCommand } from "./commands/give";
import { huntCommand } from "./commands/hunt";
import { sellCommand } from "./commands/sell";

config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

const commands = new Collection<string, Command>();
commands.set(cowoncyCommand.data.name, cowoncyCommand);
commands.set(dailyCommand.data.name, dailyCommand);
commands.set(inventoryCommand.data.name, inventoryCommand);
commands.set(giveCommand.data.name, giveCommand);
commands.set(huntCommand.data.name, huntCommand);
commands.set(sellCommand.data.name, sellCommand);

const PREFIX = "owo";

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    // FIX: If commandName is undefined, stop here.
    if (!commandName) return; 

    const command = commands.get(commandName);
    if (!command) return;

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(error);
        await message.reply("There was an error executing that command!");
    }
});

client.login(process.env.DISCORD_TOKEN);
