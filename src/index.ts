import cors from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { Elysia } from "elysia";
import jwt from "./jwt";
import { db } from "./lib/db";
import { routes as serverRoutes } from "./routes/server";
import { routes as sessionRoutes } from "./routes/session";
import { routes as usersRoutes } from "./routes/users";

// attemt to migrate the database on launch, we do this because we are using bun:sqlite which is not supported by the drizzle-kit cli

const app = new Elysia({ prefix: "/v0" })
	.use(cors())
	.use(
		swagger({
			documentation: {
				tags: [
					{
						name: "User Actions",
						description: "The actions that the user can take",
					},
					{
						name: "User Settings",
						description: "The settings the user has access to",
					},
					{ name: "Session", description: "Session API endpoints" },
					{ name: "User", description: "General User API endpoints" },
				],
				info: {
					title: "OpenChampAPI Documentation",
					description:
						"This is the OpenChamp API, an API for the LoL inspired video game OpenChamp.",
					version: "0.1.0",
				},
			},
		}),
	)
	.use(jwt)
	.use(usersRoutes)
	.use(sessionRoutes)
	.use(serverRoutes)
	.listen(Bun.env.PORT ?? 8080);

// import { StartInstances } from "./queue";
// enum STATUS {
// 	ERR,
// 	OK,
// 	FORBIDDEN,
// 	MISSING,
// }

// const app = new Elysia();

// let Queue: any[] = [];
// const QueueThread = new Worker(new URL("./queue.ts", import.meta.url));

// // Routes
// app.get("/", () => "Hello Elysia");

// app.get("/connect", () => {
// 	return {
// 		status: STATUS.FORBIDDEN,
// 		error: {
// 			code: STATUS.ERR,
// 			message: "This is for websocket connections",
// 		},
// 	};
// });

// // With Types
// app.get("/connect", {
// 	response: t.Object({
// 		status: t.Integer(),
// 	}),
// 	handler() {
// 		return {
// 			status: STATUS.FORBIDDEN,
// 			error: {
// 				code: STATUS.ERR,
// 				message: "This is for websocket connections",
// 			},
// 		};
// 	},
// });
// // WS
// app.ws("/ws", {
// 	open(ws) {
// 		console.log(`User connectd: ${ws.id}`);
// 	},
// 	close(ws) {
// 		console.log(`User disconnected: ${ws.id}`);
// 	},
// 	message(ws, message) {
// 		switch (message) {
// 			// Check RTT
// 			case "ping":
// 				ws.send("pong");
// 				break;
// 			// Join Queue
// 			case "queue":
// 				if (Queue.includes(ws)) return;
// 				Queue.push(ws);
// 				ws.send("queued");
// 				break;
// 			// Leave Queue
// 			case "leave":
// 				Queue = Queue.filter((user) => user !== ws);
// 				ws.send("left");
// 				break;
// 			// Accept Queue Pop
// 			case "accept":
// 				// Accept the user
// 				if (Queue[0] === ws) {
// 					ws.send("accepted");
// 					Queue.shift();
// 				}
// 				break;
// 			default:
// 				ws.send("Invalid Command");
// 		}
// 	},
// });

// app.listen(Bun.env.PORT || 8080);

// setInterval(() => {
// 	StartInstances(Queue);
// }, 1000);
await migrate(db, { migrationsFolder: "./drizzle" });

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
