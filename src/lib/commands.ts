import { UserError, type Command } from "@sapphire/framework";
import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  type ChatInputCommandInteraction,
  type SlashCommandBuilder,
} from "discord.js";
import type { z } from "zod";
import { brandEmbed } from "./embeds.js";
import { fetchJson, safeImageUrl } from "./http.js";

type Builder = SlashCommandBuilder;

/** Register a slash command usable only inside servers (v1 `guildOnly: true`). */
export function registerGuildCommand(
  command: Command,
  registry: Command.Registry,
  extend: (b: Builder) => unknown = (b) => b,
) {
  registry.registerChatInputCommand((b) => {
    b.setName(command.name)
      .setDescription(command.description)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setContexts(InteractionContextType.Guild);
    extend(b);
    return b;
  });
}

/** Register a slash command usable in servers and the bot's DMs (v1 `guildOnly: false`). */
export function registerAnywhereCommand(command: Command, registry: Command.Registry) {
  registry.registerChatInputCommand((b) =>
    b
      .setName(command.name)
      .setDescription(command.description)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM),
  );
}

/**
 * Register an owner-only command *only* in the configured dev guilds, hidden from
 * everyone without Administrator by default. The OwnerOnly precondition is the real gate.
 */
export function registerOwnerCommand(
  command: Command,
  registry: Command.Registry,
  extend: (b: Builder) => unknown = (b) => b,
) {
  const guildIds = command.container.config.DEV_GUILD_IDS;
  if (guildIds.length === 0) return; // no dev guild configured -> owner commands not registered at all
  registry.registerChatInputCommand(
    (b) => {
      b.setName(command.name).setDescription(command.description).setDefaultMemberPermissions(0n);
      extend(b);
      return b;
    },
    { guildIds },
  );
}

export const ephemeral = MessageFlags.Ephemeral;

/** Shared flow for the random-image commands: defer, fetch, validate, reply. */
export async function replyWithRandomImage<T>(
  interaction: ChatInputCommandInteraction,
  opts: {
    title: string;
    endpoint: string;
    schema: z.ZodType<T>;
    pickUrl: (data: T) => string;
    /** Hosts this API serves images from; anything else is refused. */
    imageHosts: readonly string[];
  },
) {
  await interaction.deferReply();
  const data = await fetchJson(opts.endpoint, opts.schema);
  const url = safeImageUrl(opts.pickUrl(data), opts.imageHosts);
  if (!url) throw new UserError({ identifier: "UntrustedImage", message: "That image service sent something unexpected. Please try again." });
  await interaction.editReply({ embeds: [brandEmbed(interaction.client).setTitle(opts.title).setImage(url)] });
}
