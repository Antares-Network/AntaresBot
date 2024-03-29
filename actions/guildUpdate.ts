import { Guild, TextChannel, Client } from "discord.js";
import guildModel from "./../models/guild";
import piiModel from "./../models/pii";

async function update(oldGuild: Guild, newGuild: Guild, client: Client) {
  let msg = ``;
  if (oldGuild.name != newGuild.name) {
    await guildModel.findOneAndUpdate(
      { GUILD_ID: newGuild.id },
      { $set: { GUILD_NAME: newGuild.name } },
      { new: true }
    );
    await piiModel.findOneAndUpdate(
      { GUILD_ID: newGuild.id },
      { $set: { GUILD_NAME: newGuild.name } },
      { new: true }
    );
  } else if (oldGuild.iconURL() != newGuild.iconURL()) {
    await guildModel.findOneAndUpdate(
      { GUILD_ID: newGuild.id },
      { $set: { GUILD_ICON_URL: newGuild.iconURL() } },
      { new: true }
    );
    } else if (oldGuild.ownerId != newGuild.ownerId) {
    msg = `GUILD OWNER UPDATE [${newGuild.name}] [${oldGuild.ownerId}] ---> [${newGuild.ownerId}]`;
    await guildModel.findOneAndUpdate(
      { GUILD_ID: newGuild.id },
      { $set: { GUILD_OWNER_ID: newGuild.ownerId } },
      { new: true }
    );
  }
  const reporting = client.channels.cache.get(
    String(process.env.REPORTING_CHANNEL)
  ) as TextChannel;
  if (reporting && msg != ``) reporting.send(msg);
}

export = { update };
