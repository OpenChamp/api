import cors from "@elysiajs/cors";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { Elysia } from "elysia";
import jwt from "./jwt";
import { db } from "./lib/db";
import { routes as sessionRoutes } from "./routes/session";
import { routes as usersRoutes } from "./routes/users";

// attemt to migrate the database on launch, we do this because we are using bun:sqlite which is not supported by the drizzle-kit cli
await migrate(db, { migrationsFolder: "./drizzle" });

const socketHeartbeatInterval = 15000;
const heartbeats = new Map<string, Timer>();
const socketTagMap = new Map<string, string>();

const app = new Elysia({ prefix: "/v0" })
	.use(cors())
	.use(jwt)
	.use(usersRoutes)
	.use(sessionRoutes)
	.ws("/ws", {
		close(ws) {
			console.log(`User disconnected: ${ws.id}`);
		},
		async open(ws) {
			const token = ws.data.query.jwt;
			console.log(token);
			if (!token) {
				ws.close();
				return;
			}
			const { tag } = (await ws.data.jwt.verify(token)) as { tag: string };
			if (!tag) {
				ws.close();
				return;
			}
			socketTagMap.set(ws.id, tag);
			heartbeats.set(
				ws.id,
				setTimeout(() => {
					ws.close();
				}, socketHeartbeatInterval * 1.5), // 1.5x the interval as a safety margin
			);
			ws.send({
				e: "start_heartbeat",
				d: { interval: socketHeartbeatInterval },
			});
			console.log(`User connected: ${ws.id}, ${tag}`);
		},
		message(ws, message) {
			console.log(message);
			if (!message || typeof message !== "object" || !("e" in message)) {
				console.log(`${ws.id} sent invalid message, closing connection`);
				ws.close();
				return;
			}
			if (message.e === "heartbeat") {
				clearTimeout(heartbeats.get(ws.id));
				heartbeats.set(
					ws.id,
					setTimeout(() => {
						ws.close();
					}, socketHeartbeatInterval * 1.5),
				);
				ws.send({ e: "heartbeat_ack" });
			}
		},
	})
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

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
