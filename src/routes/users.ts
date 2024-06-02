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
			params: t.Object(
				{
					tag: t.String(),
				},
				{
					description: "Expects a tag to search for",
				},
			),
			response: {
				200: tUser,
				404: t.Object(
					{
						error: t.String(),
					},
					{
						description: "Tag was not found",
					},
				),
			},
			detail: {
				tags: ["User"],
				description: "Get an user by their tag",
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
				set.status = 409;
				return { error: "That tag is already taken" };
			}
			const password_hash = await Bun.password.hash(password);
			await db.insert(users).values({ tag, password_hash });
			const token = await jwt.sign({ tag });
			return { token };
		},
		{
			body: t.Object(
				{
					tag: t.String(),
					password: t.String(),
				},
				{ description: "Expects a tag and a password" },
			),
			response: {
				200: t.Object(
					{
						token: t.String(),
					},
					{ description: "User account was created successfully" },
				),
				409: t.Object(
					{
						error: t.String(),
					},
					{ description: "The tag is already occupied" },
				),
				422: t.Object(
					{
						error: t.String(),
					},
					{
						description: "Invalid tag sent, Characters allowed: a-z, 0-9, ., _",
					},
				),
			},
			detail: {
				tags: ["User"],
				description: "Create an user account",
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

				return { response: "Update successful" };
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
				} else {
					set.status = 500;
					return { error: "Unknown error" };
				}
			}
		},
		{
			body: t.Object(
				{
					description: t.String(),
				},
				{ description: "Expects a description to use" },
			),
			response: {
				200: t.Object(
					{
						response: t.String(),
					},
					{
						description: "Successful update of user description",
					},
				),
				500: t.Object(
					{
						error: t.String(),
					},
					{
						description:
							"An unknown error occurred, most likely on the server side",
					},
				),
				401: t.Object(
					{
						error: t.String(),
					},
					{ description: "Tried to authenticate with an invalid token" },
				),
				400: t.Object(
					{
						error: t.String(),
					},
					{ description: "You have a malformed request body" },
				),
			},
			detail: {
				tags: ["User Settings"],
				description: "Update user description",
			},
		},
	)
	.put(
		"/@me/settings/displayname", // Display name settings
		async ({ jwt, headers, set, body: { name } }) => {
			try {
				if (!name) throw new Error('Item "name" missing in body'); // check if name is included in body
				const token = headers.authorization;
				if (!token) throw new Error("No token provided"); // check if token exists in headers
				const { tag } = (await jwt.verify(token)) as { tag: string };
				if (!tag) throw new Error("Invalid token"); // checking for invalid token

				await db
					.update(users)
					.set({ display_name: name })
					.where(eq(users.tag, tag)); // Update database entry

				return { response: "Update successful" };
			} catch (error: Error | unknown | any) {
				if (error instanceof Error) {
					switch (error.message) {
						case 'Item "name" missing in body':
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
				} else {
					set.status = 500;
					return { error: "Unknown error" };
				}
			}
		},
		{
			body: t.Object(
				{
					name: t.String(),
				},
				{ description: "Expects a display name to use" },
			),
			response: {
				200: t.Object(
					{
						response: t.String(),
					},
					{
						description: "Successful update of user display name",
					},
				),
				500: t.Object(
					{
						error: t.String(),
					},
					{
						description:
							"An unknown error occurred, most likely on the server side",
					},
				),
				401: t.Object(
					{
						error: t.String(),
					},
					{ description: "Tried to authenticate with an invalid token" },
				),
				400: t.Object(
					{
						error: t.String(),
					},
					{ description: "You have a malformed request body" },
				),
			},
			detail: {
				tags: ["User Settings"],
				description: "Update user display name",
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
						default:
							set.status = 500;
							return { error: "Unknown error" };
					}
				} else {
					set.status = 500;
					return { error: "Unknown error" };
				}
			}
		},
		{
			body: t.Object(
				{
					user_tag: t.String(),
					password: t.String(),
				},
				{
					description: "Expects an user tag and a password",
				},
			),
			response: {
				200: t.Object(
					{
						response: t.String(),
					},
					{
						description: "Successful removal of user account",
					},
				),
				500: t.Object(
					{
						error: t.String(),
					},
					{
						description:
							"An unknown error occurred, most likely on the server side",
					},
				),
				401: t.Object(
					{
						error: t.String(),
					},
					{ description: "Tried to authenticate with an invalid token" },
				),
				400: t.Object(
					{
						error: t.String(),
					},
					{ description: "You have a malformed request body" },
				),
			},
			detail: {
				tags: ["User Actions"],
				description: "Remove user account",
			},
		},
	);
