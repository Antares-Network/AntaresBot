# ![](https://cdn.discordapp.com/icons/649703068799336454/1a7ef8f706cd60d62547d2c7dc08d6f0.png) Antares Bot Privacy Policy

When providing data to the bot, you forego any rights to the content of the data provided.

### Server data (when the bot is in a server)

- Server name, ID, icon URL, owner ID, member count, and the date the bot joined
- The total **number** of messages sent in the server (a count only)
- The server's bot settings (configured channels and roles, the server's timezone, welcome/leave/birthday message
  templates, auto-mod, warning, ticket and other feature settings)
- Counting game state (current number, high score, saves)
- Auto-reply rules that server admins create
- For the starboard: the IDs of starred messages and their star counts (the message itself stays on Discord)
- For confessions: a confession number, the ID of the posted message, and a **one-way keyed hash** that lets
  moderators block a confessor without anyone, including the bot's operators, being able to tell who they are
- **Moderation cases** (warnings, auto-mod actions, automatic timeouts/kicks): case number, the member's ID, the
  moderator's ID, the reason and the date
- **Suggestions**: a number, the IDs of the post and its author, its status, and the IDs of members who voted
  (the suggestion text itself is only in the Discord message)
- **Support tickets**: a number, the opener's ID, the ticket channel ID, when it was opened/closed and by whom
  (the conversation itself is only in the Discord channel)
- An audit log of admin actions (who changed which setting and when), kept for 90 days

### Per-user data

- Once you run a command or play the counting game: your user ID and username, when you first and last used
  the bot, how often you used each command, your counting score, and your preferences (e.g. a private `/profile`)
- In servers that turn on **levels**: your XP and level in that server, earned by chatting there
- Your **birthday** (month and day only, never the year), only in servers where you set it with `/birthday set`
- Your reminders, until they are delivered or cancelled

### Message content

Message text is read **in memory only**: for the counting game, chat games, auto-moderation, auto-replies, link
previews, and to decide whether a message earns XP. It is never stored or logged by the bot. If a server enables
its **mod log**, edited and deleted messages are shown in that server's own moderator channel on Discord. If a
server enables ticket **transcripts**, a closed ticket's messages are posted as a file to that server's own ticket
log channel on Discord; the bot keeps no copy. Direct messages sent to the bot are not read, stored, or forwarded.

The bot has a development-only option (`CHAT_LOG`) that prints messages to the console of a test instance while
it is being debugged. It is off by default, is never turned on for the public bot, and writes nothing to the
database.

### Network lookups

The `/as202902` commands and the network route monitor look up public routing data about the Antares Network
(AS202902) from RIPEstat and PeeringDB. Only details about the network itself are sent in those requests; nothing
about you or your server is.

#### All data is stored on secured servers. Maximum efforts are taken to keep collected data protected, but absolute security cannot be guaranteed. We are not liable for any damages or stolen information, in which we collect, from our servers.

### Server Member Agreement

- By being a member of a server which uses Antares Bot's services or features, you are consenting to the policies outlined in this agreement. If you, the server member, do not agree with any policies outlined in this agreement, you have the right to leave the server in which this bot is a part of.

### Server Administrator Agreement

- By adding Antares Bot to your server, you are consenting to the policies outlined in this agreement. If you, the server administrator, do not agree with any of the policies outlined in this agreement, you have the right to remove Antares Bot from your server.
  This policy may change at any time without warning. It is your responsibility as a server owner to keep up with the changes.

### Deleting your data

Run `/remove` to immediately delete everything stored about you: your profile, your XP/levels and birthdays in
every server, your reminders, your support-ticket records and your suggestion votes; your name is removed from
suggestions you made (the posts stay). **Moderation cases are kept**, because they are a server's record of rule
enforcement rather than your personal data to erase; they are deleted along with everything else about a server
when the bot is removed from it.

---

## Where this is enforced in the code

Every statement above is backed by code you can read. Paths are relative to the repository root.

| Promise | Enforced by |
|---|---|
| Message text is read in memory only, never stored or logged | `src/listeners/messageCreate.ts`: the `MessageCreateListener` pipeline passes text only to in-memory checks (header comment *"Privacy: message text is read only in memory…"*). No model in `src/lib/db/models/` has a field for message text. |
| Chat logging is development-only and off by default | `src/lib/config.ts`: `CHAT_LOG` defaults to `false`. `src/listeners/messageCreate.ts` only calls `logChat` when it is on, and `src/lib/features/chatLog.ts` formats a console line; nothing is written to the database. |
| Mod-log text comes from Discord's cache, not the database | `src/lib/services/modlog.ts` (`sendModlog`), fed by `src/listeners/messageUpdate.ts` and `src/listeners/messageDelete.ts`. The cache is bounded to 200 messages per channel in `src/index.ts` (`makeCache` / `sweepers`). |
| DMs are not read or forwarded | `src/index.ts`: the gateway `intents` list has no `DirectMessages` intent, so Discord never sends DMs to the bot. |
| Only users who run a command or count get a profile | `src/lib/db/models/user.ts`, `userSchema` (*"Users who merely chat in a server are never stored"*). Written only by `recordCommand` and `recordCount` in `src/lib/services/users.ts`, which are called from `src/listeners/commandSuccess.ts` and the counting branch of `messageCreate.ts`. |
| `/remove` and `/confess` usage isn't recorded | `src/listeners/commandSuccess.ts`: the `UNTRACKED` set. |
| Confessions can't be linked to you | `src/lib/features/confessionHash.ts` (`confessorHash`: HMAC-SHA256 keyed by `CONFESSION_SECRET`, per server). `src/lib/services/confessions.ts` stores only that hash, and even its in-memory cooldown is keyed by the hash, not your ID. |
| Suggestion text and ticket conversations aren't stored | `src/lib/db/models/suggestion.ts` (`suggestionSchema`) and `src/lib/db/models/ticket.ts` (`ticketSchema`) have no text fields. `src/lib/services/tickets.ts`: `openTicket` posts the subject to Discord only, and `closeTicket` / `transcript()` build the transcript in memory and post it to the server's log channel only. |
| Birthdays are month and day only | `src/lib/db/models/member.ts`, `memberSchema` (`birthdayMonth` / `birthdayDay`, no year). Validated by `isValidBirthday` in `src/lib/features/birthdays.ts`. |
| `/remove` deletes everything listed | `src/commands/user/remove.ts` calls `deleteAllUserData` in `src/lib/services/privacy.ts`. That function deletes the profile (`deleteUserData`), every member record including XP and birthdays (`deleteMemberDataForUser`, which also drops buffered writes), reminders, ticket records (`deleteTicketsForUser`) and suggestion votes and authorship (`scrubSuggestionsForUser`). |
| Leaving a server deletes its data | `src/listeners/guildDelete.ts` calls `deleteAllGuildData` in `src/lib/services/privacy.ts`. That function deletes the server document, members, auto-replies, confessions, starboard entries, cases, suggestions and tickets; reminders become DMs. |
| Moderation cases survive `/remove` (on purpose) | `src/lib/services/privacy.ts` (doc comment on `deleteAllUserData`) and `src/lib/db/models/case.ts` (`caseSchema` comment). |
| Audit log expires after 90 days | `src/lib/db/models/audit.ts`: a TTL index on `auditSchema` (`expireAfterSeconds: 90 * 24 * 3600`); MongoDB deletes old entries itself. |
| The bot can't be used to probe private networks | `src/lib/features/mcping.ts` (`isPublicIp`) and `src/lib/services/mcStatus.ts` (`pingMinecraft` connects only to public IPs unless an owner set up a status channel). |
| Network lookups send nothing about users | `src/lib/services/asn.ts`: every RIPEstat and PeeringDB request is built from the network's own AS number, prefixes and PeeringDB IDs. `/as202902 routes` only accepts the network's own prefixes (`src/commands/user/as202902.ts`). |
| Pings stay contained | `src/index.ts`: `allowedMentions: { parse: ["users"] }` by default. Feature messages pass explicit allow-lists, e.g. `announceLevelUp` in `src/lib/services/levelUp.ts`. |
| Data stays on the operator's own machine | `src/lib/config.ts`: `BOT_MONGO_PATH` must be `mongodb://`, and cloud `mongodb+srv://` URIs are rejected. `compose.yml`: MongoDB is published on `127.0.0.1` only, the bot uses a least-privilege database user, gets an explicit environment allow-list (never the root credentials), and runs `read_only` with `cap_drop: ALL`. |
| Untrusted input can't become a database query | `src/index.ts`: `mongoose.set("sanitizeFilter", true)`. The bot's own operators are wrapped in `mongoose.trusted()`. |

### Tests that prove the deletions

- `tests/features.integration.test.ts`, *"privacy cascades"*: `/remove` leaves no profile, member records or
  reminders, and leaving a server removes all of its data without touching other servers.
- `tests/newfeatures.integration.test.ts`, *"privacy cascades for new data"*: `/remove` clears birthdays, ticket
  records, suggestion votes and authorship while keeping moderation cases, and leaving a server deletes its cases,
  suggestions and tickets.

Run them with `npm test`.
