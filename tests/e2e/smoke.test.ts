// tests/e2e/smoke.test.ts
import { expect, test } from "@playwright/test";

test("dev server is reachable", async ({ page }) => {
	const response = await page.goto("/");
	expect(response?.status()).toBeLessThan(400);
});

test("/posts loads", async ({ page }) => {
	await page.goto("/posts");
	await expect(page.getByRole("heading", { name: "Posts" })).toBeVisible();
});

test("/categories loads", async ({ page }) => {
	await page.goto("/categories");
	await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
});

test("/tags loads", async ({ page }) => {
	await page.goto("/tags");
	await expect(page.getByRole("heading", { name: "Tags" })).toBeVisible();
});

test("/friends loads", async ({ page }) => {
	const response = await page.goto("/friends");
	expect(response?.status()).toBeLessThan(400);
	await expect(page.getByRole("heading", { name: "Friends" })).toBeVisible();
});
