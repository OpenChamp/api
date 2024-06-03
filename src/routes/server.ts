import Elysia, { t } from "elysia";
import jwt from "../jwt";
import manifestJson from "../manifest.json";

// General rules for request method additions
// The order is as follows for all methods:
// 	- Get
//  - Post
//  - Put
//  - Delete
//  - Patch
//
// Have fun and discuss on discord in case we need to change this order ^^
export const routes = new Elysia({ prefix: "/server" }).use(jwt).get(
	"/manifest",
	async ({ set }) => {
		try {
			//const file = Bun.file(path);

			//const manifestJson = await file.json();
			set.status = 200;
			set.headers["Cache-control"] = "no-cache";
			return {
				name: manifestJson["name"],
				description: manifestJson.hasOwnProperty("description")
					? manifestJson["description"]
					: undefined,
				version: manifestJson.version,
				owner: manifestJson.hasOwnProperty("owner")
					? manifestJson["owner"]
					: undefined,
				docs: manifestJson.hasOwnProperty("docs")
					? manifestJson["docs"]
					: undefined,
			};
		} catch (error: any) {
			if (error instanceof Error) {
				console.log(error);
			}
			set.status = 500;
			return {
				error: "Internal unknown error. Please contact the server admin",
			};
		}
	},
	{
		response: {
			200: t.Object(
				{
					name: t.String(),
					description: t.MaybeEmpty(t.String()),
					version: t.String(),
					//gameServers: t.MaybeEmpty(t.Object({
					//	len: t.Number(),
					//	list: t.Array(//TODO)
					//})),
					owner: t.MaybeEmpty(t.String()),
					docs: t.MaybeEmpty(t.String()),
				},
				{
					description:
						"The manifest data was sent correctly. Returns the manifest",
				},
			),
			500: t.Object(
				{
					error: t.String(),
				},
				{
					description:
						"An unknown error occurred, most likely on the server side",
				},
			),
		},
		detail: {
			tags: ["Server"],
			description: "Return the manifest file containing server information",
		},
	},
);
