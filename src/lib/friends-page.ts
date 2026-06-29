import type { Friend } from "@/server/notion/friends/schema";

export type FriendsPageState =
	| {
			kind: "ready";
			friends: Friend[];
	  }
	| {
			kind: "empty";
			friends: [];
	  }
	| {
			kind: "error";
			message: string;
	  };

export async function loadFriendsPageState(
	loadFriends: () => Promise<Friend[]>,
): Promise<FriendsPageState> {
	try {
		const friends = await loadFriends();

		if (friends.length === 0) {
			return {
				kind: "empty",
				friends: [],
			};
		}

		return {
			kind: "ready",
			friends,
		};
	} catch {
		return {
			kind: "error",
			message: "Friends are unavailable right now.",
		};
	}
}
