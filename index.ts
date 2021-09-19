import DiscordJs, { Intents } from 'discord.js';
import WOKCommands from 'wokcommands';
import path from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';
dotenv.config();

const client = new DiscordJs.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

client.on('ready', () => {
    const wok = new WOKCommands(client, {
        commandDir: path.join(__dirname, 'commands'),
        typeScript: true,
        testServers: ['788541416740487218']
    })
    .setDefaultPrefix('&')
});

console.log(chalk.yellow('Trying to login to the Discord API\nPlease wait for a connection'));
client.login(process.env.BOT_TOKEN);
console.log(chalk.green("Logged into the Discord API"));

client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));

process.on('exit', (code) => {
	console.log("Now exiting...");
    console.log(`Exited with status code: ${code}`);
  });