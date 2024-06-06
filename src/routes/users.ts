import { and, eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { v4 as uuid4 } from "uuid";
import jwt from "../jwt";
import { db } from "../lib/db";
import {
	friends,
	projectionFriendship,
	projectionUserPublic,
	tUser,
	users,
} from "../lib/schema";

// General rules for request method additions
// The order is as follows for all methods:
// 	- Get
//  - Post
//  - Put
//  - Delete
//  - Patch
//
// Have fun and discuss on discord in case we need to change this order ^^
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
	.get(
		"/@me/friends",
		async ({ set, headers, jwt }) => {
			try {
				const token = headers.authorization;
				if (!token) throw new Error("No token provided"); // check if token exists in headers
				const { tag } = (await jwt.verify(token)) as { tag: string };
				if (!tag) throw new Error("Invalid token"); // checking for invalid token
				// Get the ID from the user tag
				const [user_id] = await db
					.select({
						id: users.id,
					})
					.from(users)
					.where(eq(users.tag, tag))
					.limit(1);

				// Get all user friend ids from the friends database
				const userFriendsIds = await db
					.select({
						id: friends.friend_id,
					})
					.from(friends)
					.where(
						and(eq(friends.user_id, user_id.id), eq(friends.accepted, true)),
					);

				const userFriends: any = []; // We use any instead of object here, because the type checking freaks out otherwise :3
				// Loop over the friend IDs and add to return object
				for (let friend of userFriendsIds) {
					console.log(friend);
					let friendId = await db
						.select(projectionUserPublic)
						.from(users)
						.where(eq(users.id, friend.id))
						.limit(1);
					userFriends.push(friendId);
				}

				set.status = 200;
				return userFriends;
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
			response: {
				200: t.Array(tUser, {
					description: "Returns an array of friend profile objects",
				}),
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
				description:
					"API endpoint to send a request from your own user to another user",
			},
		},
	)
	.post(
		"/@me/friends/:id", // Create a friend request to specified id
		async ({ set, headers, params: { id }, jwt }) => {
			try {
				const token = headers.authorization;
				if (!token) throw new Error("No token provided"); // check if token exists in headers
				const { tag } = (await jwt.verify(token)) as { tag: string };
				if (!tag) throw new Error("Invalid token"); // checking for invalid token
				// Get the from ID
				const [user_id] = await db
					.select({
						id: users.id,
					})
					.from(users)
					.where(eq(users.tag, tag))
					.limit(1);

				const [doesFriendshipExist] = await db
					.select(projectionFriendship)
					.from(friends)
					.where(
						and(eq(friends.user_id, user_id.id), eq(friends.friend_id, id)),
					)
					.limit(1);
				if (doesFriendshipExist) {
					throw new Error("Too many friend requests sent!");
				}

				let fUuid = uuid4();

				// Check if the friendship ID already exists, and if so, skip and generate a new one
				while (true) {
					let [fUuidExists] = await db
						.select({
							id: friends.friendship_uuid,
						})
						.from(friends)
						.where(eq(friends.friendship_uuid, fUuid))
						.limit(1);
					if (fUuidExists) {
						fUuid = uuid4();
					} else {
						break;
					}
				}

				await db.insert(friends).values({
					user_id: user_id.id,
					friend_id: id,
					friendship_uuid: fUuid,
				});
				return "Friend request was successfully sent!";
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
						case "Too many friend requests sent!":
							set.status = 429;
							return { error: error.message };
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
			/*body: t.Object(
				{
					to: t.String(),
				},
				{
					description: "To what user ID to send the friend request",
				},
			),*/
			params: t.Object(
				{
					id: t.String(),
				},
				{
					description: "User ID to send friend request",
				},
			),
			response: {
				200: t.String({
					description: "Returns with a string if the friend request went well.",
				}),
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
				429: t.Object(
					{
						error: t.String(),
					},
					{
						description:
							"Too many friend requests sent. Only 1 active request is allowed at 1 moment",
					},
				),
			},
			detail: {
				tags: ["User Actions"],
				description:
					"API endpoint to send a request from your own user to another user",
			},
		},
	)
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
	.put(
		// accept friend request
		"/@me/friend/:id/",
		async ({ headers, set, params: { id }, body: { accept }, jwt }) => {
			try {
				const token = headers.authorization;
				if (!token) throw new Error("No token provided"); // check if token exists in headers
				const { tag } = (await jwt.verify(token)) as { tag: string };
				if (!tag) throw new Error("Invalid token"); // checking for invalid token

				// Get the user id from the Users DB
				const [user_id] = await db
					.select({
						id: users.id,
					})
					.from(users)
					.where(eq(users.tag, tag))
					.limit(1);

				// Update database entry
				if (accept) {
					await db
						.update(friends)
						.set({ accepted: true })
						.where(
							and(
								eq(friends.user_id, user_id.id),
								eq(friends.friend_id, id),
								eq(friends.accepted, false),
							),
						);
				} else {
					await db
						.delete(friends)
						.where(
							and(
								eq(friends.user_id, user_id.id),
								eq(friends.friend_id, id),
								eq(friends.accepted, false),
							),
						);
				}

				return "Update successful";
			} catch (error: Error | unknown | any) {
				if (error instanceof Error) {
					switch (error.message) {
						case "Friend request already accepted":
						case 'Not a valid action. Please use either "accept" or "deny"':
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
			params: t.Object(
				{
					id: t.String(),
				},
				{
					description:
						"The id of the user which you want to accept as a friend",
				},
			),
			body: t.Object(
				{
					accept: t.Boolean(),
				},
				{
					description: "True to accept, false to deny",
				},
			),
			response: {
				200: t.String({
					description: "Successful update of user display name",
				}),
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
