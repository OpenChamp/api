import { ServerWebSocket } from "bun";
import Lobby1v1GamemodeManager from "./1v1/manager";

export interface LobbyManager {
	id: string;
	handleMessage(message: any): void;
	disconnectMember(): void;
	connectMember(tag: string, ws: ServerWebSocket): void;
}

export const gamemodes = {
	"1v1": Lobby1v1GamemodeManager,
} as const;
