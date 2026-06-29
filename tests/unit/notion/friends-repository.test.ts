import { describe, expect, it, vi } from "vitest";
import { getActiveFriends, mapNotionPageToFriend } from "@/server/notion/friends/repository";
import { notionFriendPage } from "./fixtures";

describe("mapNotionPageToFriend", () => {
	it("maps a Notion page into a stable friend model", () => {
		expect(mapNotionPageToFriend(notionFriendPage())).toEqual({
			id: "friend-1",
			name: "Kira",
			url: "https://example.com",
			avatar: "https://example.com/avatar.png",
			description: "A personal site",
			status: "Active",
			group: "Blog",
		});
	});
});

describe("getActiveFriends", () => {
	it("queries and paginates active friends from the resolved data source", async () => {
		const client = {
			databases: {
				retrieve: vi.fn().mockResolvedValue({
					object: "database",
					data_sources: [{ id: "friends-ds", name: "Friends" }],
				}),
			},
			dataSources: {
				query: vi
					.fn()
					.mockResolvedValueOnce({
						results: [notionFriendPage({ id: "friend-1" })],
						next_cursor: "cursor-1",
					})
					.mockResolvedValueOnce({
						results: [notionFriendPage({ id: "friend-2" })],
						next_cursor: null,
					}),
			},
		};

		const friends = await getActiveFriends({
			client: client as any,
			config: {
				apiKey: "secret",
				friendsDatabaseId: "friends-db",
			},
		});

		expect(friends.map((friend) => friend.id)).toEqual(["friend-1", "friend-2"]);
		expect(client.dataSources.query).toHaveBeenNthCalledWith(1, {
			data_source_id: "friends-ds",
			filter: { property: "Status", select: { equals: "Active" } },
			sorts: [{ property: "Name", direction: "ascending" }],
			page_size: 100,
		});
		expect(client.dataSources.query).toHaveBeenNthCalledWith(2, {
			data_source_id: "friends-ds",
			filter: { property: "Status", select: { equals: "Active" } },
			sorts: [{ property: "Name", direction: "ascending" }],
			page_size: 100,
			start_cursor: "cursor-1",
		});
	});
});
