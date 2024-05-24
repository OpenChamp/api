import { ulid } from "@0x57/ulid";
import { numeric, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { avatars as availableAvatars } from "./avatars";

const availableAvatarKeys = Object.keys(
	availableAvatars,
) as unknown as readonly [string, ...string[]]; // type wrangling to make drizzle happy

export const users = sqliteTable("users", {
	id: text("id", { length: 26 })
		.notNull()
		.$defaultFn(() => ulid()),
	tag: text("tag", { length: 32 }).notNull(),
	password_hash: text("password_hash"),
	avatar: text("avatar", {
		enum: availableAvatarKeys,
	})
		.notNull()
		.default("default"),
	created_at: text("created_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});

export const ranks = sqliteTable("ranks", {
	user_id: text("user_id", { length: 26 }).notNull(),
	elo: numeric("elo").notNull().default("1000"),
	gamemode: text("gamemode", { enum: ["1v1"] }).notNull(),
});

export const friends = sqliteTable("friends", {
	user_id: text("user_id", { length: 26 }).notNull(),
	friend_id: text("friend_id", { length: 26 }).notNull(),
	created_at: text("created_at")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});
