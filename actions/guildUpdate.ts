//Nate Goldsborough
//Antares Network Discord Bot
//This project will morph overtime
//Built for discord.js V.13.1.0
//Project started on December 15, 2020
//Language: typescript
//Path: actions\guildUpdate.ts
//This event fires when a guild is updated to provide detailed logging
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
    msg = `GUILD NAME UPDATE [${oldGuild.name}] ---> [${newGuild.name}]`;
  } else if (oldGuild.iconURL() != newGuild.iconURL()) {
    await guildModel.findOneAndUpdate(
      { GUILD_ID: newGuild.id },
      { $set: { GUILD_ICON_URL: newGuild.iconURL() } },
      { new: true }
    );
    msg = `GUILD ICON UPDATE [${
      newGuild.name
    }] [${oldGuild.iconURL()}] ---> [${newGuild.iconURL()}]`;
  } else if (oldGuild.mfaLevel != newGuild.mfaLevel) {
    msg = `GUILD MFA LEVEL UPDATE [${newGuild.name}] [${oldGuild.mfaLevel}] ---> [${newGuild.mfaLevel}]`;
  } else if (oldGuild.explicitContentFilter != newGuild.explicitContentFilter) {
    msg = `GUILD EXPLICIT CONTENT FILTER UPDATE [${newGuild.name}] [${oldGuild.explicitContentFilter}] ---> [${newGuild.explicitContentFilter}]`;
  } else if (oldGuild.available != newGuild.available) {
    msg = `GUILD AVAILABILITY UPDATE [${newGuild.name}] [${oldGuild.available}] ---> [${newGuild.available}]`;
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
