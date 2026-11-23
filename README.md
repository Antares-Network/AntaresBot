[![Discord](https://discordapp.com/api/guilds/649703068799336454/widget.png)](https://discordapp.com/invite/KKYw763)

# Antares Bot

Antares Bot is a small Discord bot with a lot of fun commands and features.

**v2** is a ground-up modernization of the 2020–2022 bot:

| | v1 | v2 |
|---|---|---|
| Runtime | Node 17, `ts-node` in production | Node 26 LTS, compiled JS |
| Library | discord.js 13 + WOKCommands (abandoned) | discord.js 14 + [Sapphire](https://sapphirejs.dev) 5 |
| Database | MongoDB cloud, Mongoose 6, stringly-typed docs | Local MongoDB 8.0 container, Mongoose 9, typed per-server / per-user docs, nightly backups |
| Config | unchecked `process.env` | zod-validated at startup, fails fast |
| Container | root, full Node image | multi-stage, non-root, read-only FS, no capabilities |
| Tests / CI | connect-and-exit script | Vitest unit + real-MongoDB integration tests, ESLint (strict type-checked), CodeQL, Dependabot |

## Features

- **Fun:** random cat/dog/fox/duck images, xkcd, NASA APOD, 8-ball, coin flip, dice, Minecraft account lookup and
  server status (`/mcserver`), random facts
- **Games:** trivia, scramble, word chain, native polls
- **Counting:** classic or reset mode, maths (`12*2`), high scores, saves, per-server leaderboard
- **Levels:** XP from chatting (cooldown-limited), `/rank`, `/leaderboard`, safe role rewards; XP controls
  (no-XP channels/roles, role and channel multipliers, `/xp give|take|set|reset`)
- **Community:** welcome/leave messages, auto-roles, role buttons, starboard, anonymous confessions, reminders,
  `/profile` with achievements, birthdays (time-zone aware, optional birthday role), suggestions with voting,
  support tickets (private channels, staff roles, transcripts)
- **Moderation:** auto-mod (invites, mass mentions, repeats, shouting → delete / warn / timeout), mod log,
  warnings with numbered cases (`/warn`, `/warnings`, `/case`) and auto-escalation to timeout/kick,
  custom auto-replies, link previews
- **Owner servers:** a voice channel whose name shows a Minecraft server's status and player count (`/mcstatus`)
- **Admin:** everything in one `/config` command (or the optional web dashboard), audit log

Every role the bot hands out (auto-roles, role buttons, level rewards) is re-checked at the moment it's given:
roles with moderator/admin permissions, managed roles, or roles above the bot can never be assigned.

## Running it (Docker, recommended)

1. In the [Discord Developer Portal](https://discord.com/developers/applications) → your app → **Bot**, enable the
   **Server Members** and **Message Content** privileged intents. Message content is used for: counting,
   chat games, auto-mod, auto-replies, link previews, XP eligibility and the mod log. If your bot is verified,
   make sure your approved intent use case covers these.
2. `cp .env.example .env` and fill it in. Generate the Mongo passwords with `openssl rand -hex 32`.
3. `docker compose up -d --build`
4. `docker compose logs -f bot`

Slash commands are registered automatically on startup. Owner-only commands are registered **only** in the
guilds listed in `DEV_GUILD_IDS` and are hidden from non-admins there; the `OwnerOnly` precondition checks
`BOT_OWNER_IDS` on every call.

MongoDB listens on `127.0.0.1:27017` only (for Compass / `mongosh` on the host). The bot connects over the
private compose network as a `readWrite`-only user on the `antaresbot` database, never as root.

### Data model

| Collection | One document per | Contents |
|---|---|---|
| `servers` | server (`_id` = guild ID) | name, owner, icon, member count, message count, join date, bot/admin/counting channels, current count |
| `users` | user who has used the bot (`_id` = user ID) | username, first/last seen, commands used (total + per command), counting correct/mistakes, preferences |
| `gate_entries` | ban or ignore (`_id` = `kind:id`) | `user` / `guild` / `owner` bans, `ignored_guild` |
| `bot_stats` | — (`_id` = `global`) | total messages / servers / users, server owner IDs, last refresh |
| `members` | user in a server (`_id` = `guild:user`) | XP, level, counting correct/mistakes, birthday (month/day) in that server |
| `reminders` | pending reminder | user, channel (or DM), text, due time |
| `autoreplies` | auto-reply rule | server, trigger, match mode, response |
| `confessions` | confession | server, number, message ID, keyed author hash (never the user ID) |
| `starboard` | starred message | original → starboard message, star count |
| `audit_log` | admin action | who, where, what; auto-deleted after 90 days |
| `cases` | moderation case | server, number, member, moderator, type, reason, active (pardoned or not) |
| `suggestions` | suggestion | server, number, author, post IDs, status, voter IDs (the text stays on Discord) |
| `tickets` | support ticket | server, number, opener, channel, open/closed times (the conversation stays on Discord) |

Per-server feature settings live in `servers.settings` and are validated by the zod schemas in
`src/lib/services/settings.ts`, the single source of truth for both `/config` and the dashboard.

### Web dashboard (optional, off by default)

`docker compose --profile dashboard up -d` starts it on `127.0.0.1:8080`. Put it behind your HTTPS reverse
proxy and set the `DISCORD_CLIENT_*` / `DASHBOARD_*` values in `.env` (add `<DASHBOARD_PUBLIC_URL>/auth/callback`
as an OAuth2 redirect in the Developer Portal). Server admins log in with Discord. Access is re-checked live
against Discord on every request, forms are CSRF- and origin-protected, and the owner panel (bans, ignores,
stats, global audit log) is visible only to `BOT_OWNER_IDS`.
| `migrations` | migration | which one-time imports have run |

### Moving data from the old cloud database

On first start, v2 imports the v1 collections (`guilds`, `piis`, `gates`) into the collections above:
string numbers become numbers, `<#id>` channel values become IDs, duplicate guild documents are merged,
and v1 date strings become real dates. **The v1 collections are only read, never modified**, so the old
bot can still run against the same data. Once you're happy with v2, you can drop them.

```sh
# 1. Dump the old database (use the old BOT_MONGO_PATH)
mongodump --uri "<old BOT_MONGO_PATH>" --out ./legacy-dump
# 2. Start only mongo, then restore into the local container as the app user
docker compose up -d mongo
mongorestore --uri "mongodb://antaresbot:<MONGO_APP_PASSWORD>@127.0.0.1:27017/?authSource=antaresbot" \
  --nsInclude '<old db name>.*' --nsFrom '<old db name>.*' --nsTo 'antaresbot.*' ./legacy-dump
# 3. Start the bot (imports on first boot and logs a summary)
docker compose up -d
```

### Backups and health

`mongo-backup` writes a compressed dump to `./backups/` every 24h and keeps 14 days. The bot container
reports `healthy` only while it is connected to Discord **and** MongoDB answers (`docker compose ps`).

### Upgrading from a v1 `.env`

v1 variable names still work: `BOT_OWNER_ID` → `BOT_OWNER_IDS`, `TEST_SERVERS` → `DEV_GUILD_IDS`,
`UPTIME_KUMA_MONITOR_DOMAIN` + `UPTIME_KUMA_MONITOR_ID` → `UPTIME_KUMA_PUSH_URL`. No longer used:
`BOT_DEFAULT_PREFIX`, `BOT_SETTINGS_PATH`, `VERSION` (read from `package.json`), `STATCORD_API_KEY`,
`BLADEBOTLIST_TOKEN`, `DISCORD_BOATS_TOKEN`, `DISCORD_LABS_TOKEN`, `BOTS_FOR_DISCORD_TOKEN`.

## Development

```sh
npm ci
npm run check      # typecheck + lint + tests
npm run dev        # build, then run with .env (needs BOT_MONGO_PATH pointing at 127.0.0.1)
```

```
src/
  index.ts                 bootstrap: config, Mongo, migrations, Sapphire client, graceful shutdown
  commands/{user,admin,owner}/   one slash command per file
  listeners/               Discord events (guild join/leave/update, members, messages, errors)
  preconditions/           BotChannel (bans + bot channel), AdminChannel, OwnerOnly
  interaction-handlers/    /help + /adminhelp buttons
  lib/                     config, db models + migrations, services, http, tasks
tests/                     Vitest unit tests
```

## Commands

**Community & games:** `/rank` `/leaderboard` `/trivia` `/scramble` `/wordchain` `/fact` `/poll` `/confess` `/remind`

**User:** `/profile` `/help` `/ping` `/uptime` `/version` `/stats` `/status` `/github` `/invite` `/privacy` `/remove`
`/cat` `/dog` `/fox` `/duck` `/comic` `/apod` `/ask` `/flip` `/roll` `/sneeze` `/r` `/mcuser` `/seasonbot`

**Admin:** `/config` `/setup` `/autoreply` `/rolebuttons` `/confessmod` `/adminhelp` `/counting` `/say` `/ar`. Use Discord's *Server Settings → Integrations* to
enable, disable, or role-restrict commands (this replaces WOKCommands' `/command` and `/requiredrole`).

**Owner (dev guilds only):** `/dm` `/guildmsg` `/ignore` `/ban` `/leave` `/me` `/setstatus` `/whois` `/countingupdate`

## Credits

- [Nate Goldsborough](https://nathen418.com)
- [Seth T.](https://github.com/StickyFingies)

## Invite Antares Bot to your server

<https://discord.com/oauth2/authorize?client_id=736086156759924762&permissions=388177&scope=bot%20applications.commands>

## License

- Default license is shown below. Other licenses may be chosen by the developer or the team at any time. Our default license will allow you to distribute our code without restriction as long as nothing is changed, and the terms of the Creative Commons License by--nc-nd are followed. However one must only contact us through our business email to request an exemption. If you wish to do anything that the cc by-nc-nd license does not allow, just ask about it and we will probably say go ahead.

![CC-BY_NC_ND](https://i.creativecommons.org/l/by-nc-nd/3.0/88x31.png)
