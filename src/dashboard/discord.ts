import {
  ChannelType,
  PermissionFlagsBits,
  REST,
  Routes,
  type APIChannel,
  type APIGuild,
  type APIGuildMember,
  type APIRole,
  type APIUser,
  type RESTAPIPartialCurrentUserGuild,
} from "discord.js";
import { z } from "zod";
import { DANGEROUS_PERMISSIONS } from "../lib/features/roleSafety.js";
import type { DashboardConfig } from "./config.js";

const API = "https://discord.com/api/v10";

/** Can a member with these role permissions (or ownership) manage the server? */
export function canManage(opts: { isOwner: boolean; permissions: bigint }): boolean {
  if (opts.isOwner) return true;
  return (opts.permissions & (PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)) !== 0n;
}

/** Effective guild-level permissions: @everyone plus every role the member has. */
export function memberPermissions(guild: Pick<APIGuild, "id" | "roles">, memberRoleIds: readonly string[]): bigint {
  let perms = 0n;
  for (const role of guild.roles) {
    if (role.id === guild.id || memberRoleIds.includes(role.id)) perms |= BigInt(role.permissions);
  }
  return perms;
}

const highestPosition = (guild: Pick<APIGuild, "roles">, roleIds: readonly string[]) =>
  Math.max(0, ...guild.roles.filter((r) => roleIds.includes(r.id)).map((r) => r.position));

/**
 * REST twin of roleAssignProblem (lib/features/roleSafety.ts): why a role can't be used
 * for auto-assignment, or null if safe. Same rules: not @everyone, not managed, no
 * dangerous permissions, below the bot's highest role, and below the admin's highest
 * role unless they own the server.
 */
export function restRoleProblem(
  guild: Pick<APIGuild, "id" | "roles" | "owner_id">,
  role: APIRole,
  botRoleIds: readonly string[],
  actor: { id: string; roleIds: readonly string[] },
): string | null {
  if (role.id === guild.id) return "@everyone can't be assigned.";
  if (role.managed) return `${role.name} is managed by an integration.`;
  const perms = BigInt(role.permissions);
  if (DANGEROUS_PERMISSIONS.some((p) => (perms & p) !== 0n)) {
    return `${role.name} grants moderator/admin permissions, so it can't be handed out automatically.`;
  }
  if (role.position >= highestPosition(guild, botRoleIds)) return `${role.name} is above the bot's highest role.`;
  if (actor.id !== guild.owner_id && role.position >= highestPosition(guild, actor.roleIds)) {
    return `${role.name} is not below your highest role.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// OAuth2 (user login). The access token is used once at login, then revoked.
// ---------------------------------------------------------------------------
const TokenResponse = z.object({ access_token: z.string().min(10), token_type: z.string() });

export interface LoginResult {
  user: { id: string; username: string; avatarUrl: string | null };
  manageableGuildIds: string[];
}

export class DiscordOAuth {
  public constructor(private readonly cfg: DashboardConfig) {}

  public get redirectUri() {
    return `${this.cfg.DASHBOARD_PUBLIC_URL}/auth/callback`;
  }

  public authorizeUrl(state: string): string {
    const p = new URLSearchParams({
      client_id: this.cfg.DISCORD_CLIENT_ID,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "identify guilds",
      state,
      prompt: "none",
    });
    return `https://discord.com/oauth2/authorize?${p.toString()}`;
  }

  public async login(code: string): Promise<LoginResult> {
    const tokenRes = await fetch(`${API}/oauth2/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.cfg.DISCORD_CLIENT_ID,
        client_secret: this.cfg.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: this.redirectUri,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenRes.ok) throw new Error(`OAuth token exchange failed (${tokenRes.status})`);
    const { access_token: token } = TokenResponse.parse(await tokenRes.json());
    try {
      const auth = { authorization: `Bearer ${token}` };
      const [meRes, guildsRes] = await Promise.all([
        fetch(`${API}/users/@me`, { headers: auth, signal: AbortSignal.timeout(10_000) }),
        fetch(`${API}/users/@me/guilds`, { headers: auth, signal: AbortSignal.timeout(10_000) }),
      ]);
      if (!meRes.ok || !guildsRes.ok) throw new Error("Could not read Discord profile");
      const me = (await meRes.json()) as APIUser;
      const guilds = (await guildsRes.json()) as RESTAPIPartialCurrentUserGuild[];
      return {
        user: {
          id: me.id,
          username: me.global_name ?? me.username,
          avatarUrl: me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=64` : null,
        },
        manageableGuildIds: guilds
          .filter((g) => canManage({ isOwner: g.owner, permissions: BigInt(g.permissions) }))
          .map((g) => g.id),
      };
    } finally {
      // Hygiene: we never need the user's token again.
      await fetch(`${API}/oauth2/token/revoke`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.cfg.DISCORD_CLIENT_ID,
          client_secret: this.cfg.DISCORD_CLIENT_SECRET,
          token,
          token_type_hint: "access_token",
        }),
        signal: AbortSignal.timeout(10_000),
      }).catch(() => undefined);
    }
  }
}

// ---------------------------------------------------------------------------
// Bot REST access: authoritative, live permission checks and guild metadata.
// ---------------------------------------------------------------------------
export interface GuildContext {
  guild: APIGuild;
  channels: { id: string; name: string }[];
  /** Categories (ticket category picker). Optional so test fixtures can omit it. */
  categories?: { id: string; name: string }[];
  botRoleIds: string[];
  actor: { id: string; roleIds: string[]; isOwner: boolean };
}

export interface BotApi {
  /** Null if the bot isn't in the guild or the user can't manage it (checked live). */
  manageContext(guildId: string, userId: string): Promise<GuildContext | null>;
  postEmbed(channelId: string, embed: Record<string, unknown>): Promise<void>;
}

export class DiscordBotApi implements BotApi {
  private readonly rest: REST;
  private botId: string | null = null;
  private readonly guildCache = new Map<
    string,
    { guild: APIGuild; channels: { id: string; name: string }[]; categories: { id: string; name: string }[]; at: number }
  >();

  public constructor(token: string) {
    this.rest = new REST({ version: "10", timeout: 10_000 }).setToken(token);
  }

  private async botUserId(): Promise<string> {
    this.botId ??= ((await this.rest.get(Routes.user())) as APIUser).id;
    return this.botId;
  }

  private async guildData(guildId: string) {
    const hit = this.guildCache.get(guildId);
    if (hit && Date.now() - hit.at < 30_000) return hit;
    try {
      const [guild, channels] = await Promise.all([
        this.rest.get(Routes.guild(guildId)) as Promise<APIGuild>,
        this.rest.get(Routes.guildChannels(guildId)) as Promise<APIChannel[]>,
      ]);
      const ofType = (...types: ChannelType[]) =>
        channels
          .filter((c) => types.includes(c.type))
          .map((c) => ({ id: c.id, name: "name" in c && c.name ? c.name : c.id, position: "position" in c ? c.position : 0 }))
          .sort((a, b) => a.position - b.position)
          .map(({ id, name }) => ({ id, name }));
      const entry = {
        guild,
        channels: ofType(ChannelType.GuildText, ChannelType.GuildAnnouncement),
        categories: ofType(ChannelType.GuildCategory),
        at: Date.now(),
      };
      this.guildCache.set(guildId, entry);
      if (this.guildCache.size > 500) this.guildCache.clear();
      return entry;
    } catch {
      return null; // bot not in guild, or no access
    }
  }

  private async member(guildId: string, userId: string): Promise<APIGuildMember | null> {
    try {
      return (await this.rest.get(Routes.guildMember(guildId, userId))) as APIGuildMember;
    } catch {
      return null;
    }
  }

  public async manageContext(guildId: string, userId: string): Promise<GuildContext | null> {
    if (!/^\d{17,20}$/.test(guildId)) return null;
    const data = await this.guildData(guildId);
    if (!data) return null;
    const [member, botMember] = await Promise.all([this.member(guildId, userId), this.member(guildId, await this.botUserId())]);
    if (!member || !botMember) return null;
    const isOwner = data.guild.owner_id === userId;
    if (!canManage({ isOwner, permissions: memberPermissions(data.guild, member.roles) })) return null;
    return {
      guild: data.guild,
      channels: data.channels,
      categories: data.categories,
      botRoleIds: botMember.roles,
      actor: { id: userId, roleIds: member.roles, isOwner },
    };
  }

  public async postEmbed(channelId: string, embed: Record<string, unknown>): Promise<void> {
    await this.rest
      .post(Routes.channelMessages(channelId), { body: { embeds: [embed], allowed_mentions: { parse: [] } } })
      .catch(() => undefined);
  }
}
