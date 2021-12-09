import { ICommand } from "wokcommands";
import { TextChannel } from "discord.js";
import adminChanCheck from "../../functions/adminChanCheck";

export default {
  category: "admin",
  description: "Request deletion of all data from our servers.",
  slash: true,
  testOnly: true,
  guildOnly: true,
  permissions: ["ADMINISTRATOR"],

  callback: async ({ client, interaction }) => {
    const id = interaction.user.id;
    const chan = interaction.channel as TextChannel;
    const author = interaction.user;
    if (await adminChanCheck.check(interaction, chan, author, client)) {
      interaction.reply(
        "If you would like to request that all your data be removed from our servers, please DM @nathen418#0002"
      );
    }
  },
} as ICommand;
