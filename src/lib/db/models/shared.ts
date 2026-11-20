/** Field definitions shared by every model. */

/** A Discord ID (snowflake). */
export const snowflake = { type: String, match: /^\d{17,20}$/ } as const;
export const optionalSnowflake = { ...snowflake, default: null } as const;
