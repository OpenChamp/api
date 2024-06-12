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
	}
	getPublicState() {
		const state = this.lobbyMachine.getSnapshot();
		return {
			state: state.value,
			members: Array.from(state.context.members.values()).map((m) => ({
				tag: m.user.tag,
				ready: m.ready,
			})),
		};
	}
	broadcastState() {
		app.server?.publish(
			this.id,
			JSON.stringify({ e: "lobby[state] ", d: this.getPublicState() }),
		);
	}
	handleMessage(message: any): void {
		throw new Error("Method not implemented.");
	}
	disconnectMember(): void {
		throw new Error("Method not implements.");
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
