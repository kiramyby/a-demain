export type MarkdownDiagnostic = {
	type: "notion-signed-media-url";
	message: string;
};

const NOTION_SIGNED_MEDIA_PATTERNS = [
	"prod-files-secure",
	"s3.us-west-2.amazonaws.com",
	"notion-static.com",
];

export function findNotionMediaDiagnostics(markdown: string): MarkdownDiagnostic[] {
	const hasSignedMediaUrl = NOTION_SIGNED_MEDIA_PATTERNS.some((pattern) =>
		markdown.includes(pattern),
	);

	return hasSignedMediaUrl
		? [
				{
					type: "notion-signed-media-url",
					message: "Markdown contains a Notion-hosted signed media URL that may expire.",
				},
			]
		: [];
}
