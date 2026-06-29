import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { notionPostsLoader } from "@/server/notion";

const posts = defineCollection({
	loader: notionPostsLoader(),
	schema: z.object({
		notionPageId: z.string(),
		title: z.string(),
		slug: z.string(),
		status: z.string(),
		publishedDate: z.coerce.date().nullable(),
		updatedDate: z.coerce.date().nullable(),
		category: z.string().nullable(),
		tags: z.array(z.string()),
		description: z.string(),
		coverImage: z.string().nullable(),
		featured: z.boolean(),
		seoTitle: z.string().nullable(),
		seoKeywords: z.array(z.string()),
	}),
});

export const collections = { posts };
