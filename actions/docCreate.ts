import chalk from "chalk";
import { Client, Guild, MessageEmbed, TextChannel } from "discord.js";
import guildModel from "./../models/guild";

async function event(guild: Guild, client: Client) {
  let d = new Date();
  const doc = await guildModel.findOne({ GUILD_ID: guild.id }); //find the entry for the guild
  if (doc === null) {
    const internalDoc = new guildModel({
      GUILD_JOIN_DATE: d.toString(),
      GUILD_ICON_URL: guild.iconURL(),
      GUILD_ID: guild.id,
      GUILD_NAME: guild.name,
      GUILD_OWNER_ID: guild.ownerId,
      GUILD_MEMBER_COUNT: guild.memberCount,
      GUILD_MESSAGES: 0,
    });
    await internalDoc.save();
  }
  console.log(
    chalk.blue(`I joined a new Server with name:`),
    `${chalk.green(guild.name)}`
  );
  const Embed = new MessageEmbed()
    .setColor("#ff3505")
    .setTitle(`I joined a new Server`)
    .setThumbnail(
      String(
        guild.iconURL() || "https://cdn.discordapp.com/embed/avatars/0.png"
      )
    )
    .addFields([
      { name: "Guild Creation Date:", value: guild.createdAt.toString() },
      { name: "Guild Join Date:", value: d.toString() },
      { name: "Guild Name:", value: guild.name },
      { name: "Guild ID:", value: guild.id },
      { name: "Owner ID:", value: guild.ownerId },
      { name: "Guild Member Count:", value: guild.memberCount.toString() },
    ])
    .setFooter(
      `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
      "https://playantares.com/resources/icon.png"
    );

  const WelcomeEmbed = new MessageEmbed()
    .setColor("#ff3505")
    .setTitle(`Thank you for inviting me to your server`)
    .setThumbnail(
      String(
        guild.iconURL() || "https://cdn.discordapp.com/embed/avatars/0.png"
      )
    )
    .addFields(
      {
        name: "My prefix",
        value: `My current prefix is: **\`${process.env.BOT_DEFAULT_PREFIX}\`** To change my prefix run \`${process.env.BOT_DEFAULT_PREFIX}prefix\``,
      },
      {
        name: "Commands/ help",
        value: `Please run \`${process.env.BOT_DEFAULT_PREFIX}help\` to see a list of commands`,
      },
      {
        name: "Support Server",
        value: `Join our support server at this link: https://dsc.gg/antaresnetwork`,
      },
      { name: "Invite me to your server", value: `https://dis.gg/antaresbot` }
    )
    .setFooter(
      `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`,
      "https://playantares.com/resources/icon.png"
    );

  client.users.fetch(String(process.env.BOT_OWNER_ID)).then((user) => {
    user.send({ embeds: [Embed] });
  });

  const reporting = client.channels.cache.get(
    String(process.env.REPORTING_CHANNEL)
  ) as TextChannel;
  if (reporting) reporting.send({ embeds: [Embed] });
  const firstChannel = guild.channels.cache
    .filter((c) => c.type === "GUILD_TEXT")
    .find((x) => (x as TextChannel).position == 0) as TextChannel;
  if (firstChannel) firstChannel?.send({ embeds: [WelcomeEmbed] });
  console.log(
    `Sent the welcome embed to ${firstChannel?.guild.name} in #${firstChannel?.name}`
  );
}

export = { event };
