import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";
import piiModel from  '../../models/pii';


export default {
    category: 'admin',
    description: 'Setup command for the admin channel',
    aliases: ['adminChannel'],
    slash: false,
    guildOnly: true,
    permissions: ['MANAGE_GUILD'],

    callback: async ({ channel, message }) => {
        if (message.mentions.channels.first() == undefined) {
            channel.send("Please re-run this command and mention a channel as an argument.")
        } else {
            //check to see if an admin channel is set for this server yet
            const req = await piiModel.findOne({ GUILD_ID: message.guild?.id });
            //if the server has an admin channel, send it here
            if (req.DEFAULT_CHANNEL_ID !== null) {
                channel.send(`This server's default channel was: <#${req.GUILD_DEFAULT_CHANNEL}>`);
            }
            const doc = await piiModel.findOneAndUpdate({ GUILD_ID: message.guild?.id }, { $set: { GUILD_ADMIN_CHANNEL: message.mentions.channels.first()?.id } }, { new: true });
            message.channel.send(`Set the admin channel to <#${doc.GUILD_ADMIN_CHANNEL}>`);
            await doc.save();
        }
    }
} as ICommand