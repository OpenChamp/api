import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { jwt } from "..";
import { db } from "../lib/db";
import { users } from "../lib/schema";

export const routes = new Elysia({ prefix: "/users" })
	.use(jwt)
	.get("/:tag", ({ jwt }) => {}) // TODO: return public user info
	.get("/@me/friends", ({ jwt }) => {}) // TODO: return friends
	.post("/@me/friends", ({ jwt }) => {}) // TODO: send friend request
	.post(
		"/",
		async ({ set, body: { tag, password }, jwt }) => {
			const [user] = await db
				.select({ password_hash: users.password_hash })
				.from(users)
				.where(eq(users.tag, tag))
				.limit(1);
			if (user) {
				set.status = 400;
				return { error: "That tag is already taken" };
			}
			const password_hash = await Bun.password.hash(password);
			const [created_user] = await db
				.insert(users)
				.values({ tag, password_hash })
				.returning();
			const token = await jwt.sign({ tag: created_user.tag });
			return { token };
		},
		{
			body: t.Object({
				tag: t.String(),
				password: t.String(),
			}),
			response: {
				200: t.Object({
					token: t.String(),
				}),
				400: t.Object({
					error: t.String(),
				}),
			},
		},
	);
