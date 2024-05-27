import jwt from "@elysiajs/jwt";

if (!Bun.env.JWT_SECRET) {
	console.error("env.JWT_SECRET is required");
	process.exit(1);
}

export default jwt({
	name: "jwt",
	secret: Bun.env.JWT_SECRET,
});
