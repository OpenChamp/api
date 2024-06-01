import { setup } from "xstate";

export const machine = setup({
	types: {
		context: {} as {},
		events: {} as { type: "ready" } | { type: "matched" } | { type: "accept" },
	},
	guards: {
		"not all ready": function ({ context, event }) {
			// Add your guard condition here
			return true;
		},
		"not all accepted": function ({ context, event }) {
			// Add your guard condition here
			return true;
		},
	},
}).createMachine({
	context: {},
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
});
