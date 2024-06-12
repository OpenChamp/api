import { createActor, setup } from "xstate";
import { users } from "../../../lib/schema";

export type DraftPlayer = {
	user: typeof users.$inferSelect;
	team: "red" | "blue";
	pick?: string;
};

interface MachineContext {
	red: DraftPlayer;
	blue: DraftPlayer;
}

const template = setup({
	types: {
		context: { red: {}, blue: {} } as MachineContext,
		events: {} as { type: "pick" },
	},
	guards: {
		"not all picked": function ({ context, event }) {
			return context.red.pick === undefined || context.blue.pick === undefined;
		},
	},
});

export function createMachine(context: MachineContext) {
	return createActor(
		template.createMachine({
			context,
			id: "draft",
			initial: "picking",
			states: {
				picking: {
					on: {
						pick: [
							{
								target: "picking",
								guard: {
									type: "not all picked",
								},
							},
							{
								target: "in_game",
							},
						],
						abandon: {
							target: "abandoned",
						},
					},
				},
				in_game: {
					type: "final",
				},
				abandoned: {
					type: "final",
				},
			},
		}),
	);
}
