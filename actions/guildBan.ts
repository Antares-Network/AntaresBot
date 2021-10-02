import { User } from "discord.js";
//event to fire when a Guild is banned from inviting the bot
import gateModel from "./../models/gate";

module.exports = {
  banUser: async function (user: User) {
    const gate = await gateModel.findOne({ NAME: "GATE" }); //find the entry for the guild
    let bannedUsers = gate.BANNED_USERS;
    let inlist = false;
    for (let i = 0; i < bannedUsers.length; i++) {
      if (bannedUsers[i] === String(user.id)) {
        //if the user has already been banned from using the bot
        inlist = true;
      }
    }
    //if the user is in the list of banned users, return false
    if (inlist) {
      return false;
    } else {
      //if they are not already in  the banned users list, add them now
      bannedUsers.push(user.id);
      await gateModel.findOneAndUpdate(
        { NAME: "GATE" },
        { $set: { BANNED_USERS: bannedUsers } },
        { new: true }
      );
      return true;
    }
  },
  unBanUser: async function (user: User) {
    const gate = await gateModel.findOne({ NAME: "GATE" }); //find the entry for the guild
    let bannedUsers = gate.BANNED_USERS;
    let wasbanned = false;
    for (let i = 0; i < bannedUsers.length; i++) {
      if (bannedUsers[i] === user.id) {
        wasbanned = true;
        bannedUsers.splice(i, 1);
      }
    }

    if (wasbanned) {
      await gateModel.findOneAndUpdate(
        { NAME: "GATE" },
        { $set: { BANNED_USERS: bannedUsers } },
        { new: true }
      );
    }

    return wasbanned;
  },
  banGuild: async function (guildID: string) {
    const gate = await gateModel.findOne({ NAME: "GATE" }); //find the entry for the guild
    let bannedGuilds = gate.BANNED_GUILDS;
    let inlist = false;
    for (let i = 0; i < bannedGuilds.length; i++) {
      if (bannedGuilds[i] === guildID) {
        //if the user has already been banned from using the bot
        inlist = true;
      }
    }
    if (inlist) {
      return false;
    } else {
      bannedGuilds.push(guildID);
      await gateModel.findOneAndUpdate(
        { NAME: "GATE" },
        { $set: { BANNED_GUILDS: bannedGuilds } },
        { new: true }
      );
      return true;
    }
  },
  unBanGuild: async function (guildID: string) {
    const gate = await gateModel.findOne({ NAME: "GATE" }); //find the entry for the guild
    let bannedGuilds = gate.BANNED_USERS;
    let wasbanned = false;
    for (let i = 0; i < bannedGuilds.length; i++) {
      if (bannedGuilds[i] === guildID) {
        wasbanned = true;
        bannedGuilds.splice(i, 1);
      }
    }

    if (wasbanned) {
      await gateModel.findOneAndUpdate(
        { NAME: "GATE" },
        { $set: { BANNED_GUILDS: bannedGuilds } },
        { new: true }
      );
    }

    return wasbanned;
  },
  banOwner: async function (ownerID: string) {
    const gate = await gateModel.findOne({ NAME: "GATE" }); //find the entry for the guild
    let bannedOwners = gate.BANNED_OWNERS;
    let inlist = false;
    for (let i = 0; i < bannedOwners.length; i++) {
      if (bannedOwners[i] === ownerID) {
        //if the user has already been banned from using the bot
        inlist = true;
      }
    }
    if (inlist) {
      return false;
    } else {
      bannedOwners.push(ownerID);
      await gateModel.findOneAndUpdate(
        { NAME: "GATE" },
        { $set: { BANNED_OWNERS: bannedOwners } },
        { new: true }
      );
      return true;
    }
  },
  unBanOwner: async function (ownerID: string) {
    const gate = await gateModel.findOne({ NAME: "GATE" }); //find the entry for the guild
    let bannedOwners = gate.BANNED_OWNERS;
    let wasbanned = false;
    for (let i = 0; i < bannedOwners.length; i++) {
      if (bannedOwners[i] === ownerID) {
        wasbanned = true;
        bannedOwners.splice(i, 1);
      }
    }

    if (wasbanned) {
      await gateModel.findOneAndUpdate(
        { NAME: "GATE" },
        { $set: { BANNED_GUILDS: bannedOwners } },
        { new: true }
      );
    }

    return wasbanned;
  },
};
