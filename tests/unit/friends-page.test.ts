import { describe, expect, it } from "vitest";
import { getFriendsPageView, loadFriendsPageState } from "@/lib/friends-page";
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
	it("returns disabled state without loading friends when the route is disabled", async () => {
		let loadCount = 0;

		await expect(
			loadFriendsPageState(
				async () => {
					loadCount += 1;
					return [friend];
				},
				{ route: false, failBuildOnError: false },
			),
		).resolves.toEqual({
			kind: "disabled",
			message: "Friends are not enabled.",
		});
		expect(loadCount).toBe(0);
	});

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
			loadFriendsPageState(
				async () => {
					throw new Error("missing config");
				},
				{ route: true, failBuildOnError: false },
			),
		).resolves.toEqual({
			kind: "error",
			message: "Friends are unavailable right now.",
		});
	});

	it("throws load failures when friends errors are configured as build failures", async () => {
		await expect(
			loadFriendsPageState(
				async () => {
					throw new Error("missing config");
				},
				{ route: true, failBuildOnError: true },
			),
		).rejects.toThrow("missing config");
	});
});

describe("getFriendsPageView", () => {
	it("returns disabled route copy and response status", () => {
		expect(getFriendsPageView({ kind: "disabled", message: "Friends are not enabled." })).toEqual({
			heading: "Friends",
			notice: "Friends are not enabled.",
			responseStatus: {
				status: 404,
				statusText: "Not found",
			},
			cards: [],
		});
	});

	it("returns unavailable copy without changing response status", () => {
		expect(
			getFriendsPageView({
				kind: "error",
				message: "Friends are unavailable right now.",
			}),
		).toEqual({
			heading: "Friends",
			notice: "Friends are unavailable right now.",
			cards: [],
		});
	});

	it("returns empty copy without changing response status", () => {
		expect(getFriendsPageView({ kind: "empty", friends: [] })).toEqual({
			heading: "Friends",
			notice: "No active friends yet.",
			cards: [],
		});
	});

	it("returns friend card content for ready state", () => {
		expect(getFriendsPageView({ kind: "ready", friends: [friend] })).toEqual({
			heading: "Friends",
			cards: [
				{
					id: "friend-1",
					name: "Kira",
					url: "https://example.com",
					avatar: "https://example.com/avatar.png",
					description: "A personal site",
					group: "Blog",
				},
			],
		});
	});
});
