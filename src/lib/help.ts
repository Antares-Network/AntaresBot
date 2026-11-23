import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type Client, type EmbedBuilder } from "discord.js";
import { ICON_URL, inviteUrl, SEASONBOT_INVITE_URL, SLASH_FAQ_URL, SUPPORT_SERVER_URL } from "./constants.js";
import { brandEmbed } from "./embeds.js";

/** Button custom IDs are namespaced so the interaction handler can route them statelessly. */
export const HELP_PREFIX = "help:";

type Page = { label: string; emoji: string; style: ButtonStyle; disabled?: boolean; build: (c: Client) => EmbedBuilder };

const list = (lines: string[]) => [...lines, "**More coming soon**"].join("\n");

export const HELP_PAGES = {
  images: {
    label: "Random Images",
    emoji: "📸",
    style: ButtonStyle.Success,
    build: (c) =>
      brandEmbed(c)
        .setTitle("Random Image Commands")
        .setDescription(
          list([
            "**cat**: Gets a random cat image",
            "**dog**: Gets a random dog image",
            "**fox**: Gets a random fox image",
            "**duck**: Gets a random duck image",
            "**comic**: Gets a random XKCD comic",
            "**apod**: NASA's Astronomy Picture of the Day",
          ]),
        ),
  },
  chance: {
    label: "Chance Games",
    emoji: "🎲",
    style: ButtonStyle.Success,
    build: (c) =>
      brandEmbed(c)
        .setTitle("Chance Games Commands")
        .setDescription(
          list([
            "**flip**: Flips a coin. Heads or Tails",
            "**roll**: Rolls a Die",
            "**ask** `<question>`: Asks the Magic 8 Ball your question",
          ]),
        ),
  },
  skills: {
    label: "Games & Trivia",
    emoji: "🕹️",
    style: ButtonStyle.Success,
    build: (c) =>
      brandEmbed(c)
        .setTitle("Games & Trivia Commands")
        .setDescription(
          list([
            "**trivia**: Multiple-choice trivia. First to type the right letter wins",
            "**scramble**: Unscramble the word before anyone else",
            "**wordchain start / stop**: Each word starts with the last letter of the previous one",
            "**fact**: A random fact",
            "**poll** `question options`: Start a poll (answers separated by `|`)",
          ]),
        ),
  },
  soon: {
    label: "Community",
    emoji: "🏆",
    style: ButtonStyle.Danger,
    build: (c) =>
      brandEmbed(c)
        .setTitle("Community Commands")
        .setDescription(
          list([
            "**rank** `[user]`: Your level and rank in this server (if levels are on)",
            "**leaderboard** `[xp|counting]`: Top members in this server",
            "**profile view** `[user]`: Stats and achievements",
            "**confess** `text`: Post an anonymous confession (if enabled)",
            "**remind me** `in about`: Set a reminder · **remind list / cancel**",
            "React with ⭐ to put great messages on the starboard (if enabled)",
            "**birthday set / remove / upcoming**: Birthday announcements",
            "**suggest** `idea`: Post a suggestion people can vote on",
            "**mcserver** `address`: Is a Minecraft server online, and who's playing?",
            "Open a support ticket with the 🎫 button (if the server has a ticket panel)",
          ]),
        ),
  },
  utility: {
    label: "Utility/Misc",
    emoji: "📈",
    style: ButtonStyle.Danger,
    build: (c) =>
      brandEmbed(c)
        .setTitle("Utility/Misc Commands")
        .setDescription(
          list([
            "**ping**: Sends the ping time of the bot",
            "**r**: Does something",
            "**seasonbot**: Sends an embed telling you all about our partner bot SeasonBot",
            "**sneeze**: Makes the bot sneeze",
            "**invite**: Sends an invite link to add me to your server",
            "**mcuser** `<username>`: Looks up a Minecraft account",
            "**help**: Shows this help embed",
            "**uptime**: Shows the bot's uptime",
            "**version**: Shows the bot's version number",
            "**stats**: Shows the bot's stats embed",
            "**status**: Link to the Antares Network status page",
            "**as202902 overview / prefixes / upstreams / routes / peering / rpki / aspa / health**: Live routing data for the Antares Network",
            "**adminhelp**: Shows the admin command help embed",
            "**github**: Shows the github link for the bot",
            "**profile view** `[user]`: Shows bot stats for you or someone else",
            "**profile private** `enabled`: Hide your profile from other people",
            "**privacy**: Sends the bot's Privacy policy in DM's",
            "**remove**: Deletes all data the bot stores about you",
          ]),
        ),
  },
  // --- admin help pages ---
  config: {
    label: "Config Commands",
    emoji: "⚙️",
    style: ButtonStyle.Success,
    build: (c) =>
      brandEmbed(c)
        .setTitle("Bot Config commands")
        .setDescription(
          [
            "**setup** `type:default channel:#channel`: Sets the channel the bot will talk in for regular commands",
            "**setup** `type:admin channel:#channel`: Sets the server's admin channel",
            "**ar**: Does something",
            "**adminhelp**: Shows the main admin help embed",
            "**remove**: Provides info about how to remove all your personal data from the bot's database",
            "**say** `content [channel]`: Makes the bot say something, optionally in another channel.",
            "**config view**: See every setting · **config levels / counting / welcome / automod / modlog / previews / starboard / confessions**",
            "**autoreply add / remove / list**: Custom 'when someone says X, reply Y' rules",
            "**rolebuttons**: Post buttons members click to get roles",
            "**confessmod block / unblock-all**: Moderate anonymous confessions",
            "**warn** · **warnings** · **case view / pardon / reason / settings**: Warnings, numbered cases, auto-escalation",
            "**xp give / take / set / reset / no-xp-channel / no-xp-role / role-multiplier / channel-multiplier / rules**",
            "**birthday setup / disable** · **suggestion setup / approve / deny / consider** · **ticket setup / staff / panel / add / remove / close**",
            "",
            "**Enable/disable commands or restrict them to roles:** use Discord's built-in *Server Settings → Integrations → Antares Bot*.",
          ].join("\n"),
        ),
  },
  counting: {
    label: "Counting Commands/Setup",
    emoji: "🔢",
    style: ButtonStyle.Success,
    build: (c) =>
      brandEmbed(c)
        .setTitle("Counting Config")
        .setDescription(
          list([
            "**counting**: Creates a channel called counting in your server. Also sends an embed with the rules of the game. Must be run in the admin channel.",
            "**config counting mode**: `classic` (wrong numbers are deleted) or `reset` (a mistake resets to 0; saves earned every 100 counts protect you)",
            "**config counting math**: Allow maths like `12*2`",
            "**leaderboard counting**: Top counters, high score and saves",
          ]),
        ),
  },
} satisfies Record<string, Page>;

export type HelpPageKey = keyof typeof HELP_PAGES;

/** Look up a page from an untrusted custom ID suffix (own properties only). */
export function helpPage(key: string): Page | undefined {
  return Object.hasOwn(HELP_PAGES, key) ? HELP_PAGES[key as HelpPageKey] : undefined;
}

function row(keys: HelpPageKey[]) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    keys.map((k) => {
      const p: Page = HELP_PAGES[k];
      return new ButtonBuilder()
        .setCustomId(`${HELP_PREFIX}${k}`)
        .setLabel(p.label)
        .setEmoji(p.emoji)
        .setStyle(p.style)
        .setDisabled(p.disabled ?? false);
    }),
  );
}

export function userHelp(client: Client) {
  const embed = brandEmbed(client)
    .setTitle("Antares Bot Help and Commands")
    .setThumbnail(ICON_URL)
    .setDescription(
      `Welcome to Antares Bot! Here you can find all the commands you need!\n**ALL COMMANDS ARE SLASH COMMANDS**\nLearn how slash commands work [here](${SLASH_FAQ_URL}).`,
    )
    .addFields(
      {
        name: "Command Categories",
        value: "📸**Random Images**\n\n🎲**Chance Games**\n\n🕹️**Games & Trivia**\n\n🏆**Community**\n\n📈**Utility**",
      },
      { name: "Invite Me", value: `[Click to add me to your server!](${inviteUrl(client.user?.id ?? "")})` },
      { name: "Support Server", value: `[Click to join the support server!](${SUPPORT_SERVER_URL})` },
      { name: "Invite SeasonBot", value: `[Click to invite SeasonBot to your server!](${SEASONBOT_INVITE_URL})` },
    );
  return { embeds: [embed], components: [row(["images", "chance", "skills", "soon", "utility"])] };
}

export function adminHelp(client: Client) {
  const embed = brandEmbed(client)
    .setTitle("Admin Help")
    .setURL(SUPPORT_SERVER_URL)
    .addFields(
      { name: "About", value: "Here you will find all the commands to control Antares Bot in your server" },
      { name: "Command Categories", value: "⚙️**Bot Config**\n\n🔢**Counting Config**" },
      { name: "Invite Me", value: `[Click to add me to your server!](${inviteUrl(client.user?.id ?? "")})` },
      { name: "Support Server", value: `[Click to join the support server!](${SUPPORT_SERVER_URL})` },
      { name: "Invite SeasonBot", value: `[Click to invite SeasonBot to your server!](${SEASONBOT_INVITE_URL})` },
    );
  return { embeds: [embed], components: [row(["config", "counting"])] };
}
