import { ServerWebSocket } from "bun";
import { createActor, setup } from "xstate";
import { users } from "../../../lib/schema";

export type Player = {
	user: typeof users.$inferSelect;
	ws: ServerWebSocket;
	ready: boolean;
	accepted: boolean;
};

interface MachineContext {
	members: Map<string, Player>;
}

export const template = setup({
	types: {
		context: {
			members: new Map<string, Player>(),
		} as MachineContext,
		events: {} as { type: "ready" } | { type: "matched" } | { type: "accept" },
	},
	guards: {
		"not all ready": function ({ context, event }) {
			return Array.from(context.members.values()).some((m) => !m.ready);
		},
		"not all accepted": function ({ context, event }) {
			return Array.from(context.members.values()).some((m) => !m.accepted);
		},
	},
});
export function createMachine() {
	return createActor(
		template.createMachine({
			context: {
				members: new Map<string, Player>(),
			},
			id: "Lobby",
			initial: "unqueueable",
			states: {
				"unqueueable": {
					on: {
						ready: [
							{
								target: "unqueueable",
								guard: {
									type: "not all ready",
								},
							},
							{
								target: "in queue",
							},
						],
					},
				},
				"in queue": {
					on: {
						matched: {
							target: "accepting",
						},
					},
				},
				"accepting": {
					on: {
						accept: [
							{
								target: "accepting",
								guard: {
									type: "not all accepted",
								},
							},
							{
								target: "in game",
							},
						],
					},
					after: {
						"10000": {
							target: "unqueueable",
							guard: {
								type: "not all accepted",
							},
						},
					},
				},
				"in game": {
					type: "final",
				},
			},
		}),
	);
}
