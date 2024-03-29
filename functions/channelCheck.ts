import {
  CommandInteraction,
  MessageEmbed,
  TextChannel,
} from "discord.js";
import piiModel from "../models/pii";
import gateModel from "../models/gate";

async function check( interaction: CommandInteraction, channel: TextChannel ): Promise<boolean> {
  const srv = await piiModel.findOne({ GUILD_ID: channel.guild?.id }); //find the entry for the guild
  const gate = await gateModel.findOne({ NAME: "GATE" });

  // check if the user has been banned from using the bot
  if (gate.BANNED_GUILDS.includes(interaction.guild?.id)) {
    const banEmbed = new MessageEmbed()
      .setColor("#ff3505")
      .setTitle("Guild ban notice")
      .setDescription(
        `<@${interaction.user.id}>, This guild has been banned from using this bot by the owner.`
      );
      interaction.reply({embeds: [banEmbed], ephemeral: true});
    return Promise.resolve(false);
  }

  //check if the user has been banned from using the bot
  if (gate.BANNED_USERS.includes(interaction.user.id)) {
    const banEmbed = new MessageEmbed()
      .setColor("#ff3505")
      .setTitle("User ban notice")
      .setDescription(
        `<@${interaction.user.id}>, You have been banned from using this bot by the owner.`
      );
      interaction.reply({ embeds: [banEmbed], ephemeral: true });
    return Promise.resolve(false);
  }

  //check if the user sent their message in the default channel
  if (channel.id != srv.GUILD_DEFAULT_CHANNEL) {
    if (srv.GUILD_DEFAULT_CHANNEL === null) {
      interaction.reply(
        `The server owner has not set a default channel yet.\n If you are the server owner please use \`/setup #channel\``
      );
      return Promise.resolve(false); //exit the loop and don't parse the command
    } else {
      // Let the user know what channel they need to be in
      await interaction.reply({
        content: `You can only use this command in <#${srv.GUILD_DEFAULT_CHANNEL}>`,
        ephemeral: true,
      });
      return Promise.resolve(false);
    }
  }
  return Promise.resolve(true);
}

export = { check };