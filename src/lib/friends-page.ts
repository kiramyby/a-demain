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

export type FriendsPageCard = {
	id: string;
	name: string;
	url: string;
	avatar: string;
	description: string;
	group: string;
};

export type FriendsPageView = {
	heading: "Friends";
	notice?: string;
	responseStatus?: {
		status: number;
		statusText: string;
	};
	cards: FriendsPageCard[];
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

export function getFriendsPageView(state: FriendsPageState): FriendsPageView {
	switch (state.kind) {
		case "disabled":
			return {
				heading: "Friends",
				notice: state.message,
				responseStatus: {
					status: 404,
					statusText: "Not found",
				},
				cards: [],
			};

		case "error":
			return {
				heading: "Friends",
				notice: state.message,
				cards: [],
			};

		case "empty":
			return {
				heading: "Friends",
				notice: "No active friends yet.",
				cards: [],
			};

		case "ready":
			return {
				heading: "Friends",
				cards: state.friends.map((friend) => ({
					id: friend.id,
					name: friend.name,
					url: friend.url,
					avatar: friend.avatar,
					description: friend.description,
					group: friend.group,
				})),
			};
	}
}
