import { ServerWebSocket } from "bun";
import { eq } from "drizzle-orm";
import { LobbyManager } from "../";
import { app } from "../..";
import { db } from "../../lib/db";
import { users } from "../../lib/schema";
import { createMachine as createDraftMachine } from "./fsm/draft";
import { createMachine as createLobbyMachine } from "./fsm/lobby";

export default class Lobby1v1GamemodeManager implements LobbyManager {
	lobbyMachine: ReturnType<typeof createLobbyMachine>;
	draftMachine?: ReturnType<typeof createDraftMachine>;

	constructor(public id: string) {
		this.lobbyMachine = createLobbyMachine();
		this.lobbyMachine.start();
		this.lobbyMachine.subscribe((state) => {
			this.broadcastState();
		});
	}
	getPublicState() {
		const state = this.lobbyMachine.getSnapshot();
		return {
			state: state.value,
			gamemode: "1v1",
			members: Array.from(state.context.members.values()).map((m) => ({
				id: m.user.id,
				tag: m.user.tag,
				avatar: m.user.avatar,
				ready: m.ready,
			})),
		};
	}
	broadcastState() {
		app.server?.publish(
			this.id,
			JSON.stringify({ e: "lobby[state]", d: this.getPublicState() }),
		);
	}
	handleMessage(tag: string, message: { e: string; d: any }): void {
		switch (message.e) {
			case "lobby[set-ready]":
				this.setReadyFor(tag, message.d.ready === true);
				break;
			default:
				console.warn(
					`Unhandled message for ${tag} in lobby ${this.id}: ${message.e}`,
				);
		}
	}
	disconnectMember(tag: string): void {
		const state = this.lobbyMachine.getSnapshot();
		state.context.members.delete(tag);
		this.broadcastState();
	}
	setReadyFor(tag: string, ready: boolean): void {
		const state = this.lobbyMachine.getSnapshot();
		if (!["unqueueable", "in queue"].includes(state.value)) return;
		const member = state.context.members.get(tag);
		if (!member) throw new Error("Member doesnt exist");
		member.ready = ready;
		this.broadcastState();
		this.lobbyMachine.send({ type: "ready" });
	}
	async connectMember(tag: string, ws: ServerWebSocket) {
		const [user] = await db.select().from(users).where(eq(users.tag, tag));
		if (!user) throw new Error("User doesnt exist");
		ws.subscribe(this.id);
		const state = this.lobbyMachine.getSnapshot();
		state.context.members.set(tag, { user, ws, ready: false, accepted: false });
		ws.send(JSON.stringify({ e: "lobby[joined]", d: this.getPublicState() }));
		this.broadcastState();
	}
}
