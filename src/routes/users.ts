import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import jwt from "../jwt";
import { db } from "../lib/db";
import { projectionUserPublic, tUser, users } from "../lib/schema";

export const routes = new Elysia({ prefix: "/users" })
	.use(jwt)
	.get(
		"/:tag", // Get public profile
		async ({ set, params: { tag } }) => {
			// kind of done? Please take look at this, sometimes lag bug apprears
			try {
				const [user] = await db
					.select(projectionUserPublic)
					.from(users)
					.where(eq(users.tag, tag))
					.limit(1);
				if (user === undefined) throw new Error("User not found");
				return user;
			} catch (error: Error | unknown) {
				set.status = 404;
				return { error: "Tag not found" };
			}
		},
		{
			response: {
				200: tUser,
				404: t.Object({
					error: t.String(),
				}),
			},
		},
	)
	.get("/@me/friends", ({ jwt }) => {}) // TODO: return friends
	.post("/@me/friends", ({ jwt }) => {}) // TODO: send friend request
	.post(
		"/", // Create user account
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
			await db.insert(users).values({ tag, password_hash });
			const token = await jwt.sign({ tag });
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
	)
	.post(
		"/@me/description",
		async ({ jwt, set, body: { description } }) => {
			try {
			} catch (error: Error | unknown | any) {}
		},
		{
			body: t.Object({
				description: t.String(),
			}),
			response: {
				401: t.Object({
					error: t.String(),
				}),
			},
		},
	);
