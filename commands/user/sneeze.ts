import { MessageEmbed } from 'discord.js';
import { ICommand } from "wokcommands";

export default {
    category: 'User',
    description: 'Makes the bot sneeze',
    slash: false,
    testOnly: true,
    guildOnly: true,

    callback: ({ message }) => {
        const sneezes = [
            "***Achoo!***",
            "*chew!*",
            "Ah... Ah... **A_CHOO!_**",
            "_Ah..._***CHOOOOOOOOOOOOOOOOOOOO!***",
            "*Achoo!* Excuse me!",
            ""
        ];
        message.reply(
            sneezes[Math.floor(Math.random() * Math.floor(sneezes.length))]
        );
    }
} as ICommand