import { ICommand } from "wokcommands";
import { statcord } from "../../index"

export default {
  name: "privacy",
  category: "user",
  description: "Sends the privacy policy for the bot in a dm",
  slash: true,
  guildOnly: false,
  requiredPermissions: ["SEND_MESSAGES"],

  callback: ({ interaction }) => {
    statcord.postCommand("privacy", interaction.user.id);
    interaction.user.send(
      "**Data Collected By Command and when features are enabled**\n" +
        "The following may be collected when the bot joins a server and or when a user voluntarily enters this information. " +
        "When providing data in this way, you forego any rights to the content of the data provided.\n" +
        "**Bot Join Date**" +
        "**Guild Name**" +
        "**Guild Owner ID**" +
        "**Guild Icon URL**" +
        "**The total messages sent in the guild**" +
        "**Guild Member count**" +
        "**Guild prefix**" +
        "**Some channel id’s**(Admin channel, Default channel, music channel, counting channel, etc)" +
        "**The current number in the counting channel**" +
        "**All data is stored on secured servers. Maximum efforts are taken to keep collected data protected, but absolute security cannot be guaranteed. We are not liable for any damages or stolen information, in which we collect, from our servers.**\n\n" +
        "**Server Member Agreement**\n" +
        "By being a member of a server which uses Antares Bot's services or features, you are consenting to the policies outlined in this agreement. If you, the server member, do not agree with any policies outlined in this agreement, you have the right to leave the server in which this bot is a part of.\n\n" +
        "**Server Administrator Agreement**\n" +
        "By adding Antares Bot to your server, you are consenting to the policies outlined in this agreement. If you, the server administrator, do not agree with any of the policies outlined in this agreement, you have the right to remove Antares Bot from your server.\n" +
        "This policy may change at any time without warning. It is your responsibility as a server owner to keep up with the changes.\n\n" +
        `**To request the data we store on you to be deleted from our database, please run the command ${process.env.BOT_DEFAULT_PREFIX}remove**\n\n`
    );
    return "You have been sent a DM with the privacy policy. If you do not have DM's enabled, you will not get this message.";
  },
} as ICommand;