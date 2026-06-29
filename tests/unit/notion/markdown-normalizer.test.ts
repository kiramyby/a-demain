import { describe, expect, it } from "vitest";
import { normalizeNotionMarkdown } from "@/server/notion/content/markdown-normalizer";

describe("normalizeNotionMarkdown", () => {
	it("preserves regular markdown", () => {
		expect(normalizeNotionMarkdown("# Title\n\nBody.")).toEqual({
			markdown: "# Title\n\nBody.",
			diagnostics: [],
		});
	});

	it("reports Notion-hosted media URLs", () => {
		const result = normalizeNotionMarkdown(
			"![x](https://prod-files-secure.s3.us-west-2.amazonaws.com/file.png)",
		);

		expect(result.diagnostics).toEqual([
			{
				type: "notion-signed-media-url",
				message: "Markdown contains a Notion-hosted signed media URL that may expire.",
			},
		]);
	});
});
