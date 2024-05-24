import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { jwt } from "..";
import { db } from "../lib/db";
import { users } from "../lib/schema";

export const routes = new Elysia({ prefix: "/session" })
	.use(jwt)
	.get("/", ({ jwt }) => {}) // TODO: return current user
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
