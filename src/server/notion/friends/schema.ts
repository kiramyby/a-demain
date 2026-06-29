export type Friend = {
	id: string;
	name: string;
	url: string;
	avatar: string;
	description: string;
	status: string;
	group: string;
};

export const FRIEND_PROPERTIES = {
	name: "Name",
	url: "URL",
	avatar: "Avatar",
	description: "Description",
	status: "Status",
	group: "Group",
} as const;
