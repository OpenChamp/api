import { ulid } from "@0x57/ulid";
import {
	boolean,
	datetime,
	int,
	mysqlEnum,
	mysqlTable,
	tinytext,
	varchar,
} from "drizzle-orm/mysql-core";
import { t } from "elysia";
import { avatars as availableAvatars } from "./avatars";

const availableAvatarKeys = Object.keys(
	availableAvatars,
) as unknown as readonly [string, ...string[]]; // type wrangling to make drizzle happy

export const users = mysqlTable("users", {
	id: varchar("id", { length: 26 }) // TODO: store in binary? is it worth it for us?
		.notNull()
		.$defaultFn(() => ulid()),
	tag: varchar("tag", { length: 32 }).notNull(),
	display_name: varchar("display_name", { length: 32 }),
	password_hash: varchar("password_hash", { length: 128 }).notNull(),
	avatar: mysqlEnum("avatar", availableAvatarKeys).notNull().default("default"),
	created_at: datetime("created_at")
		.notNull()
		.$defaultFn(() => new Date()),
	description: tinytext("description").notNull().default(""),
});

export const projectionUserPublic = {
	id: users.id,
	tag: users.tag,
	display_name: users.display_name,
	avatar: users.avatar,
	created_at: users.created_at,
	description: users.description,
};

export const tUser = t.Object({
	id: t.String(),
	tag: t.RegExp("^[a-z0-9_.]+$"),
	display_name: t.Any(),
	avatar: t.String(),
	created_at: t.Date(),
	description: t.String(),
});

export const ranks = mysqlTable("ranks", {
	user_id: varchar("user_id", { length: 26 }).notNull(),
	elo: int("elo").notNull().default(1000),
	gamemode: mysqlEnum("gamemode", ["1v1"]).notNull(),
});

export const friends = mysqlTable("friends", {
	user_id: varchar("user_id", { length: 26 }).notNull(),
	friend_id: varchar("friend_id", { length: 26 }).notNull(),
	created_at: datetime("created_at")
		.notNull()
		.$defaultFn(() => new Date()),
	friendship_uuid: varchar("friendship_uuid", { length: 36 }).notNull(),
	accepted: boolean("accepted").notNull().default(false),
});

export const projectionFriendship = {
	user_id: friends.user_id,
	friend_id: friends.friend_id,
	created_at: friends.created_at,
	friendship_uuid: friends.friendship_uuid,
	accepted: friends.accepted,
};

export const tFriend = t.Object({
	user_id: t.String(),
	friend_id: t.String(),
	created_at: t.Date(),
	friendship_uuid: t.String(),
	accepted: t.Boolean(),
});
