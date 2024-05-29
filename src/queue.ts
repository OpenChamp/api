type Instance = {
	port: number;
	address: string;
};

function StartInstances(queue: WebSocket[]) {
	if (queue.length < 2) return;
	// Create array of lobby instances
	const lobbies = [];
	while (queue.length >= 2) {
		const player1 = queue.shift();
		const player2 = queue.shift();
		lobbies.push([player1, player2]);
	}
	// Start instances
	for (const lobby of lobbies) {
		GenerateInstance().then((instance: Instance) => {
			if (lobby[0] && lobby[1]) {
				lobby[0].send(`start:${instance.address}:${instance.port}`);
				lobby[1].send(`start:${instance.address}:${instance.port}`);
			}
		});
	}
}

function GenerateInstance(): Promise<Instance> {
	return new Promise((res, rej) => {
		// Generate instance
		res({
			port: 8080,
			address: "",
		});
	});
}

export { StartInstances };
