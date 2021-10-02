import { ICommand } from "wokcommands";
import piiModel from '../../models/pii';

export default {
    category: 'owner',
    description: 'Updates the counting channel db\'s',
    slash: false,
    ownerOnly: true,
    hidden: true,
    guildOnly: true,

    callback: ({ client }) => {
        client.guilds.cache.forEach(async (guild) => {
            console.log("started scanning"+ guild.name);
            const req = await piiModel.findOne({ guildID: guild.id });
            let chan = guild?.channels.cache.find(c => c?.name.includes('counting') && c?.type === 'GUILD_TEXT');

            if (req.GUILD_COUNTING_CHANNEL_ID === null) {
                if (chan) {
                    await piiModel.findOneAndUpdate({ GUILD_ID: guild.id }, { $set: { GUILD_COUNTING_CHANNEL_ID: chan.id } }, { new: true });
                    console.log("updated " + guild.name);
                }
            }
        });
    }
} as ICommand