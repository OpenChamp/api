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
				if (user === undefined) throw new Error("user was not found");
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
			let re = new RegExp("^[a-z0-9_.]+$"); // allowed characters only
			if (!re.test(tag)) {
				set.status = 422;
				return { error: "Invalid tag. Characters allowed: a-z, 0-9, ., _" };
			}
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
				422: t.Object({
					error: t.String(),
				}),
			},
		},
	)
	.put(
		"/@me/settings/description", // Description settings
		async ({ jwt, headers, set, body: { description } }) => {
			try {
				if (!description) throw new Error('Item "description" missing in body'); // check if description is included in body
				const token = headers.authorization;
				if (!token) throw new Error("No token provided"); // check if token exists in headers
				const { tag } = (await jwt.verify(token)) as { tag: string };
				if (!tag) throw new Error("Invalid token"); // checking for invalid token

				await db
					.update(users)
					.set({ description: description })
					.where(eq(users.tag, tag)); // Update database entry

				return { response: "Post successful" };
			} catch (error: Error | unknown | any) {
				if (error instanceof Error) {
					switch (error.message) {
						case 'Item "description" missing in body':
							set.status = 400;
							return { error: error.message };
						case "No token provided":
						case "Invalid token":
							set.status = 401;
							return { error: "Invalid token" };
						default:
							set.status = 500;
							return { error: "Unknown error" };
					}
				}
			}
		},
		{
			body: t.Object({
				description: t.String(),
			}),
			response: {
				500: t.Object({
					error: t.String(),
				}),
				401: t.Object({
					error: t.String(),
				}),
				400: t.Object({
					error: t.String(),
				}),
			},
		},
	)
	.delete(
		"/@me",
		async ({ headers, set, body: { user_tag, password }, jwt }) => {
			try {
				const token = headers.authorization;
				if (!token) throw new Error("No token provided"); // check if token exists in headers
				const { tag } = (await jwt.verify(token)) as {
					tag: string;
				};
				if (!tag) throw new Error("Invalid token"); // checking for invalid token

				const [user] = await db // password checking
					.select({ password_hash: users.password_hash })
					.from(users)
					.where(eq(users.tag, user_tag))
					.limit(1);
				if (
					!user ||
					!(await Bun.password.verify(password, user.password_hash))
				) {
					set.status = 401;
					return { error: "Invalid username or password" };
				}

				await db.delete(users).where(eq(users.tag, user_tag));

				set.status = 200;
				return { response: "Account successfully deleted" };
			} catch (error: Error | unknown | any) {
				if (error instanceof Error) {
					switch (error.message) {
						case "No token provided":
						case "Invalid token":
							set.status = 401;
							return { error: "Invalid token" };
					}
				} else {
					set.status = 404;
					return { error: "Unknown error" };
				}
			}
		},
		{
			body: t.Object({
				user_tag: t.String(),
				password: t.String(),
			}),
			response: {
				200: t.Object({
					response: t.String(),
				}),
				401: t.Object({
					error: t.String(),
				}),
			},
		},
	);
