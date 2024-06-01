import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import jwt from "../jwt";
import { db } from "../lib/db";
import { projectionUserPublic, tUser, users } from "../lib/schema";

export const routes = new Elysia({ prefix: "/session" })
	.use(jwt)
	.get(
		"/",
		async ({ set, headers, jwt }) => {
			try {
				const token = headers.authorization;
				if (!token) throw new Error("No token provided");
				const { tag } = (await jwt.verify(token)) as { tag: string };
				if (!tag) throw new Error("Invalid token"); // checking for invalid token
				const [user] = await db
					.select(projectionUserPublic)
					.from(users)
					.where(eq(users.tag, tag))
					.limit(1);
				return user;
			} catch (error) {
				set.status = 401;
				return { error: "Invalid token" };
			}
		},
		{
			response: {
				200: tUser,
				401: t.Object({
					error: t.String(),
				}),
			},
		},
	)
	.post(
		"/",
		async ({ set, body: { tag, password }, jwt }) => {
			const [user] = await db
				.select({ password_hash: users.password_hash })
				.from(users)
				.where(eq(users.tag, tag))
				.limit(1);
			if (!user || !(await Bun.password.verify(password, user.password_hash))) {
				set.status = 401;
				return { error: "Invalid username or password" };
			}
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
				401: t.Object({
					error: t.String(),
				}),
			},
		},
	);
