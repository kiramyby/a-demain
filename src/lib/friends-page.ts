import { SITE_FEATURES } from "@/config";
import type { Friend } from "@/server/notion/friends/schema";

export type FriendsFeatureConfig = {
	route: boolean;
	failBuildOnError: boolean;
};

export type FriendsPageState =
	| {
			kind: "disabled";
			message: string;
	  }
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
	config: FriendsFeatureConfig = SITE_FEATURES.friends,
): Promise<FriendsPageState> {
	if (!config.route) {
		return {
			kind: "disabled",
			message: "Friends are not enabled.",
		};
	}

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
	} catch (error) {
		if (config.failBuildOnError) {
			throw error;
		}

		return {
			kind: "error",
			message: "Friends are unavailable right now.",
		};
	}
}
