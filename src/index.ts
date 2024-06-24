import { ulid } from "@0x57/ulid";
import cors from "@elysiajs/cors";
import { ServerWebSocket } from "bun";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { Elysia } from "elysia";
import { gamemodes } from "./gamemodes";
import { LobbyManager } from "./gamemodes/lobby_manager";
import jwt from "./jwt";
import { db } from "./lib/db";
import { routes as sessionRoutes } from "./routes/session";
import { routes as usersRoutes } from "./routes/users";

// attemt to migrate the database on launch, we do this because we are using bun:sqlite which is not supported by the drizzle-kit cli
await migrate(db, { migrationsFolder: "./drizzle" });

const socketHeartbeatInterval = 15000;
const heartbeats = new Map<string, Timer>();
const socketTagMap = new Map<string, string>();
const lobbies = new Map<string, LobbyManager>();
const tagLobbyMap = new Map<string, string>();

export const app = new Elysia({ prefix: "/v0" })
	.use(cors())
	.use(jwt)
	.use(usersRoutes)
	.use(sessionRoutes)
	.ws("/ws", {
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
		async close(ws) {
			const tag = socketTagMap.get(ws.id);
			if (tag) {
				const lobbyId = tagLobbyMap.get(tag);
				if (lobbyId) {
					const lobby = lobbies.get(lobbyId);
					if (lobby) {
						lobby.disconnectMember(tag);
						// TODO: cleanup dead lobbies
					}
					tagLobbyMap.delete(tag);
				}
				socketTagMap.delete(ws.id);
			}
			console.log(`User disconnected: ${ws.id}`);
		},
		// TODO: this is a bit messy, just meant as a proof of concept for now. needs to be refactored once the entire protocol is figured out.
		message(ws, message) {
			console.log(message);
			const tag = socketTagMap.get(ws.id);
			if (!message || typeof message !== "object" || !("e" in message)) {
				console.log(
					`${ws.id} (${tag}) sent invalid message, closing connection`,
				);
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
				return;
			}
			if (!tag) {
				ws.close();
				return;
			}
			const currentLobbyId = tagLobbyMap.get(tag);
			if (currentLobbyId) {
				lobbies.get(currentLobbyId)?.handleMessage(tag, message);
				return;
			}
			if (message.e === "lobby[create]") {
				const LobbyManagerClass =
					gamemodes[message.d?.gamemode as keyof typeof gamemodes];
				console.log(LobbyManagerClass);
				if (!LobbyManagerClass) {
					ws.send({
						e: "error",
						d: { message: "Invalid gamemode" },
					});
					return;
				}
				const lobby = new LobbyManagerClass(ulid());
				lobbies.set(lobby.id, lobby);
				tagLobbyMap.set(tag, lobby.id);
				lobby.connectMember(tag, ws as unknown as ServerWebSocket);
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
