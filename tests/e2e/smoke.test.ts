// tests/e2e/smoke.test.ts
import { test, expect } from '@playwright/test'

test('dev server is reachable', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBeLessThan(400)
})
