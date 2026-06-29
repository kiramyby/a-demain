import { describe, expect, it } from "vitest";
import { loadFriendsPageState } from "@/lib/friends-page";
import type { Friend } from "@/server/notion/friends/schema";

const friend: Friend = {
	id: "friend-1",
	name: "Kira",
	url: "https://example.com",
	avatar: "https://example.com/avatar.png",
	description: "A personal site",
	status: "Active",
	group: "Blog",
};

describe("loadFriendsPageState", () => {
	it("returns ready state when active friends exist", async () => {
		await expect(loadFriendsPageState(async () => [friend])).resolves.toEqual({
			kind: "ready",
			friends: [friend],
		});
	});

	it("returns empty state when no active friends exist", async () => {
		await expect(loadFriendsPageState(async () => [])).resolves.toEqual({
			kind: "empty",
			friends: [],
		});
	});

	it("returns error state when friends cannot be loaded", async () => {
		await expect(
			loadFriendsPageState(async () => {
				throw new Error("missing config");
			}),
		).resolves.toEqual({
			kind: "error",
			message: "Friends are unavailable right now.",
		});
	});
});
