import { Message, Client, TextChannel } from 'discord.js';
import piiModel from '../models/pii';

async function check(message: Message, client: Client): Promise<boolean> {
    const srv = await piiModel.findOne({ GUILD_ID: message.guild?.id }); //find the entry for the guild
    //check if admin commands were sent in the admin channel
    if (message.channel.id != srv.GUILD_ADMIN_CHANNEL) {
        if (srv.GUILD_ADMIN_CHANNEL == null) {
            message.channel.send(`The server owner has not set an admin channel yet.\n If you are the server owner please use \`${process.env.BOT_DEFAULT_PREFIX}admin #channel\``);
            return Promise.resolve(false); //exit the loop and don't parse the command
        } else {
            //ping the admin in the admin channel
            let MSG = await (client.channels?.cache.get(srv.GUILD_ADMIN_CHANNEL) as TextChannel).send(`<@${message.author.id}> Please use admin commands in this channel`);
            setTimeout( async () => {
                MSG.delete()
            }, 5000);
            return Promise.resolve(false);
        }
    }
    return Promise.resolve(true);
}

export = { check };