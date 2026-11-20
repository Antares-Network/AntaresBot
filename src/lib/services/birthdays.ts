import { container } from "@sapphire/framework";
import type { Client, Guild } from "discord.js";
import mongoose from "mongoose";
import { MemberModel, memberId, ServerModel } from "../db/models.js";
import { birthdaysOn, dateKey, daysUntil, localDate } from "../features/birthdays.js";
import { roleAssignProblem } from "../features/roleSafety.js";
import { getFeatureSettings, renderTemplate } from "./settings.js";

export async function setBirthday(guildId: string, userId: string, month: number, day: number): Promise<void> {
  await MemberModel.updateOne(
    { _id: memberId(guildId, userId) },
    { $set: { birthdayMonth: month, birthdayDay: day }, $setOnInsert: { guildId, userId } },
    { upsert: true },
  );
}

export async function clearBirthday(guildId: string, userId: string): Promise<boolean> {
  const res = await MemberModel.updateOne({ _id: memberId(guildId, userId) }, { $set: { birthdayMonth: null, birthdayDay: null } });
  return res.modifiedCount === 1;
}

export async function getBirthday(guildId: string, userId: string): Promise<{ month: number; day: number } | null> {
  const doc = await MemberModel.findById(memberId(guildId, userId), { birthdayMonth: 1, birthdayDay: 1 }).lean();
  return doc?.birthdayMonth && doc.birthdayDay ? { month: doc.birthdayMonth, day: doc.birthdayDay } : null;
}

/** The next `limit` birthdays in a server, soonest first (in the server's time zone). */
export async function upcomingBirthdays(guildId: string, timeZone: string, limit = 10, now = new Date()) {
  const today = localDate(now, timeZone);
  const rows = await MemberModel.find(
    { guildId, birthdayMonth: mongoose.trusted({ $gte: 1 }) },
    { userId: 1, birthdayMonth: 1, birthdayDay: 1 },
  )
    .limit(5000)
    .lean();
  return rows
    .map((r) => ({ userId: r.userId, month: r.birthdayMonth as number, day: r.birthdayDay as number }))
    .map((r) => ({ ...r, inDays: daysUntil(today, r.month, r.day) }))
    .sort((a, b) => a.inDays - b.inDays || a.userId.localeCompare(b.userId))
    .slice(0, limit);
}

/**
 * Daily birthday run for every server that has birthdays configured. Each server is
 * claimed for its local date with a conditional update, so a restart (or two instances)
 * never announces twice. Yesterday's birthday role is removed first.
 */
export async function runBirthdays(client: Client<true>, now = new Date()): Promise<void> {
  const servers = await ServerModel.find(
    {
      $or: [
        { "settings.birthdays.channelId": mongoose.trusted({ $type: "string" }) },
        { "settings.birthdays.roleId": mongoose.trusted({ $type: "string" }) },
      ],
    },
    { _id: 1 },
  ).lean();
  for (const { _id } of servers) {
    const guild = client.guilds.cache.get(_id);
    if (!guild) continue;
    await runForGuild(guild, now).catch((err: unknown) => {
      container.logger.warn(`Birthdays failed in ${guild.id}:`, err);
    });
  }
}

async function runForGuild(guild: Guild, now: Date): Promise<void> {
  const settings = await getFeatureSettings(guild.id);
  const cfg = settings.birthdays;
  if (!cfg.channelId && !cfg.roleId) return;
  const today = localDate(now, settings.general.timezone);
  if (today.hour < cfg.hour) return;
  const key = dateKey(today);

  const prev = await ServerModel.findOneAndUpdate(
    { _id: guild.id, "birthdayState.lastDate": mongoose.trusted({ $ne: key }) },
    { $set: { "birthdayState.lastDate": key } },
    { returnDocument: "before", projection: { birthdayState: 1 } },
  ).lean();
  if (!prev) return; // already done today

  const role = cfg.roleId ? guild.roles.cache.get(cfg.roleId) : undefined;
  const roleOk = role && !roleAssignProblem(role);
  for (const userId of prev.birthdayState?.roleHolders ?? []) {
    if (!roleOk) break;
    const m = await guild.members.fetch(userId).catch(() => null);
    if (m?.roles.cache.has(role.id)) await m.roles.remove(role, "Birthday is over").catch(() => undefined);
  }

  const dates = birthdaysOn(today);
  const rows = await MemberModel.find(
    { guildId: guild.id, $or: dates.map((d) => ({ birthdayMonth: d.month, birthdayDay: d.day })) },
    { userId: 1 },
  )
    .limit(100)
    .lean();
  const ids = rows.map((r) => r.userId);
  const members = ids.length ? await guild.members.fetch({ user: ids }).catch(() => null) : null;
  const present = members ? [...members.values()].filter((m) => !m.user.bot) : [];

  const holders: string[] = [];
  if (roleOk) {
    for (const m of present)
      if (
        await m.roles.add(role, "Birthday").then(
          () => true,
          () => false,
        )
      )
        holders.push(m.id);
  }
  await ServerModel.updateOne({ _id: guild.id }, { $set: { "birthdayState.roleHolders": holders } });

  const channel = cfg.channelId ? guild.channels.cache.get(cfg.channelId) : undefined;
  if (present.length === 0 || !channel?.isSendable()) return;
  const lines = present
    .slice(0, 20)
    .map((m) =>
      renderTemplate(cfg.message, { userId: m.id, username: m.user.username, server: guild.name, memberCount: guild.memberCount }),
    );
  await channel
    .send({ content: lines.join("\n").slice(0, 2000), allowedMentions: { users: present.slice(0, 20).map((m) => m.id) } })
    .catch(() => undefined);
}
