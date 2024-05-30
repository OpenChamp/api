import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
	host: Bun.env.db_host,
	user: Bun.env.db_user,
	password: Bun.env.db_password,
});

export const db = drizzle(connection);
