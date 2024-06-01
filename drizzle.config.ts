import { defineConfig } from "drizzle-kit";

if (
	!process.env.db_host ||
	!process.env.db_user ||
	!process.env.db_password ||
	!process.env.db_name
) {
	throw new Error("Missing database credentials");
}

export default defineConfig({
	schema: "./src/lib/schema.ts",
	dialect: "mysql",
	dbCredentials: {
		host: process.env.db_host,
		user: process.env.db_user,
		password: process.env.db_password,
		database: process.env.db_name,
	},
});
