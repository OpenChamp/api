import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

function check_env() {
	let missing_parts: String[] = [];
	let is_missing = false;
	if (!Bun.env.db_host) {
		missing_parts.push("db_host");
		is_missing = true;
	}
	if (!Bun.env.db_user) {
		missing_parts.push("db_user");
		is_missing = true;
	}
	if (!Bun.env.db_password) {
		missing_parts.push("db_password");
		is_missing = true;
	}
	if (!Bun.env.db_name) {
		missing_parts.push("db_name");
		is_missing = true;
	}

	if (is_missing) {
		console.error(
			`These environment variables are missing: ${missing_parts.join(",")}.`,
		);
		process.exit(1);
	}
}

const connection = await mysql.createConnection({
	host: Bun.env.db_host,
	user: Bun.env.db_user,
	password: Bun.env.db_password,
	database: Bun.env.db_name,
});

check_env();

export const db = drizzle(connection);
