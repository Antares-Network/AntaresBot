import chalk from "chalk";
import { Client, Guild, MessageEmbed, MessageActionRow, MessageButton, TextChannel } from "discord.js";
import guildModel from "./../models/guild";

async function event(guild: Guild, client: Client) {
  let d = new Date();
  const doc = await guildModel.findOne({ GUILD_ID: guild.id }); //find the entry for the guild
  if (doc === null) {
    const internalDoc = new guildModel({
      GUILD_JOIN_DATE: d.toString(),
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
  const ownerName = await guild.fetchOwner().then((owner) => owner.user.tag)
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
      { name: "Owner Name:", value: ownerName },
      { name: "Owner ID:", value: guild.ownerId },
      { name: "Guild Member Count:", value: guild.memberCount.toString() },
    ])
    .setFooter({text:
      `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
      "https://playantares.com/resources/icon.png"
    });

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
        value: `All commands including admin commands are now slash commands. You can learn more about how to use Slash/Application commands [here](https://support.discord.com/hc/en-us/articles/1500000368501-Slash-Commands-FAQ)`,
      },
      {
        name: "Commands/ help",
        value: `Please run \`/help\` to see a list of commands`,
      }
    )
    .setFooter({text:
      `Delivered in: ${client.ws.ping}ms | Antares Bot | ${process.env.VERSION}`, iconURL:
      "https://playantares.com/resources/icon.png"
    });

    const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                  .setURL("https://discord.com/oauth2/authorize?client_id=736086156759924762&permissions=388177&scope=bot%20applications.commands")
                  .setLabel("Invite Me")
                  .setStyle("LINK")
            )
            .addComponents(
                new MessageButton()
                  .setURL("https://discord.gg/KKYw763")
                  .setLabel("Support Server")
                  .setStyle("LINK")
            )

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
  if (firstChannel) firstChannel?.send({ embeds: [WelcomeEmbed], components: [row]});
  
  console.log(
    `Sent the welcome embed to ${firstChannel?.guild.name} in #${firstChannel?.name}`
  );
}

export = { event };
