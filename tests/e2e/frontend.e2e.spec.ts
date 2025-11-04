import { test, expect, Page } from '@playwright/test'

test.describe('Frontend', () => {
  let page: Page

  test.beforeAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext()
    page = await context.newPage()
  })

  test('can go on homepage', async ({ page }) => {
    await page.goto('http://localhost:3000')

    await expect(page).toHaveTitle(/Infoshop Bookstore/)

    const heading = page.locator('h1').first()

    await expect(heading).toHaveText('Welcome to Infoshop')
  })

  test('homepage shows new arrivals section', async ({ page }) => {
    await page.goto('http://localhost:3000')

    const newArrivalsHeading = page.locator('h2').filter({ hasText: 'New Arrivals' })
    await expect(newArrivalsHeading).toBeVisible()
  })

  test('can navigate to shop page', async ({ page }) => {
    await page.goto('http://localhost:3000')

    const shopLink = page.locator('a', { hasText: 'Browse All Books' })
    await shopLink.click()

    await expect(page).toHaveURL(/\/shop/)
    await expect(page.locator('h1')).toHaveText('Shop Books')
  })
})
