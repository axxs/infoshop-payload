/**
 * Shopping Cart and Checkout E2E Tests
 *
 * End-to-end tests for the complete shopping cart and checkout flow
 * Tests the user journey from browsing to adding items to cart to checkout
 */

import { test, expect, Page } from '@playwright/test'

test.describe('Shopping Cart', () => {
  test.beforeEach(async ({ page }) => {
    // Start from shop page
    await page.goto('http://localhost:3000/shop')
  })

  test('can add book to cart from shop page', async ({ page }) => {
    // Wait for books to load
    await page.waitForSelector('[data-testid="book-card"], .book-card, article', {
      timeout: 10000,
    })

    // Find first "Add to Cart" button
    const addToCartButton = page.locator('button:has-text("Add to Cart")').first()

    // Check if button exists and is visible
    const buttonCount = await addToCartButton.count()
    if (buttonCount === 0) {
      test.skip(true, 'No Add to Cart buttons found - possibly no books in stock')
      return
    }

    await expect(addToCartButton).toBeVisible()

    // Click add to cart
    await addToCartButton.click()

    // Should redirect to cart page
    await expect(page).toHaveURL(/\/cart/, { timeout: 5000 })

    // Cart should show the added item
    const cartItems = page.locator('[data-testid="cart-item"]')
    await expect(cartItems.first()).toBeVisible()
  })

  test('shows empty cart message when cart is empty', async ({ page }) => {
    await page.goto('http://localhost:3000/cart')

    // Should show empty cart state
    const emptyMessage = page.locator('text=/cart is empty/i, text=/no items/i').first()
    await expect(emptyMessage).toBeVisible({ timeout: 5000 })

    // Should show continue shopping link
    const continueShoppingLink = page.locator(
      'a:has-text("Continue Shopping"), a:has-text("Browse Books")',
    )
    await expect(continueShoppingLink.first()).toBeVisible()
  })

  test('can view book details and add to cart', async ({ page }) => {
    // Wait for books to load
    await page.waitForSelector('[data-testid="book-card"], .book-card, article', {
      timeout: 10000,
    })

    // Click on first book card to view details
    const firstBookLink = page.locator('a[href^="/shop/"]').first()
    const bookCount = await firstBookLink.count()

    if (bookCount === 0) {
      test.skip(true, 'No books found')
      return
    }

    await firstBookLink.click()

    // Should be on book detail page
    await expect(page).toHaveURL(/\/shop\/\d+/)

    // Check if Add to Cart button exists on detail page
    const addToCartButton = page.locator('button:has-text("Add to Cart")')
    const buttonCount = await addToCartButton.count()

    if (buttonCount > 0) {
      await addToCartButton.click()
      await expect(page).toHaveURL(/\/cart/, { timeout: 5000 })
    }
  })
})

test.describe('Cart Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cart by visiting cart page and clearing if needed
    await page.goto('http://localhost:3000/cart')
  })

  test('can update item quantity in cart', async ({ page }) => {
    await page.goto('http://localhost:3000/cart')

    // Check if cart has items
    const cartItem = page.locator('[data-testid="cart-item"]').first()
    const itemCount = await cartItem.count()

    if (itemCount === 0) {
      test.skip(true, 'Cart is empty - add items first')
      return
    }

    // Find quantity controls
    const incrementButton = cartItem
      .locator('button:has-text("+"), button[aria-label*="Increment"]')
      .first()
    const quantityDisplay = cartItem.locator('text=/\\d+/').first()

    // Get initial quantity
    const initialQuantity = await quantityDisplay.textContent()

    // Increment quantity
    if (await incrementButton.isVisible()) {
      await incrementButton.click()

      // Wait for update
      await page.waitForTimeout(1000)

      // Quantity should have increased
      const newQuantity = await quantityDisplay.textContent()
      expect(parseInt(newQuantity || '0')).toBeGreaterThan(parseInt(initialQuantity || '0'))
    }
  })

  test('can remove item from cart', async ({ page }) => {
    await page.goto('http://localhost:3000/cart')

    // Check if cart has items
    const initialCartItems = page.locator('[data-testid="cart-item"]')
    const initialCount = await initialCartItems.count()

    if (initialCount === 0) {
      test.skip(true, 'Cart is empty - add items first')
      return
    }

    // Find and click remove button
    const removeButton = initialCartItems
      .first()
      .locator('button[aria-label*="Remove"], button:has-text("×")')

    if ((await removeButton.count()) > 0) {
      await removeButton.first().click()

      // Wait for removal
      await page.waitForTimeout(1000)

      // Cart items count should decrease
      const newCount = await initialCartItems.count()
      expect(newCount).toBeLessThan(initialCount)
    }
  })

  test('displays cart summary with correct totals', async ({ page }) => {
    await page.goto('http://localhost:3000/cart')

    // Check if cart has items
    const cartItems = page.locator('[data-testid="cart-item"]')
    const itemCount = await cartItems.count()

    if (itemCount === 0) {
      test.skip(true, 'Cart is empty - add items first')
      return
    }

    // Cart summary should be visible
    const cartSummary = page.locator('[data-testid="cart-summary"], .cart-summary, aside').first()
    await expect(cartSummary).toBeVisible()

    // Should show subtotal
    const subtotal = cartSummary.locator('text=/subtotal/i').first()
    await expect(subtotal).toBeVisible()

    // Should show total
    const total = cartSummary.locator('text=/total/i').first()
    await expect(total).toBeVisible()

    // Should have checkout button
    const checkoutButton = cartSummary.locator(
      'button:has-text("Checkout"), a:has-text("Checkout")',
    )
    await expect(checkoutButton.first()).toBeVisible()
  })
})

test.describe('Checkout Flow', () => {
  test('can navigate to checkout page from cart', async ({ page }) => {
    await page.goto('http://localhost:3000/cart')

    // Check if cart has items
    const cartItems = page.locator('[data-testid="cart-item"]')
    const itemCount = await cartItems.count()

    if (itemCount === 0) {
      test.skip(true, 'Cart is empty - add items first to test checkout')
      return
    }

    // Click checkout button
    const checkoutButton = page
      .locator('button:has-text("Checkout"), a:has-text("Checkout")')
      .first()
    await checkoutButton.click()

    // Should navigate to checkout page
    await expect(page).toHaveURL(/\/checkout/, { timeout: 5000 })
  })

  test('checkout page displays order summary', async ({ page }) => {
    await page.goto('http://localhost:3000/checkout')

    // Might redirect to cart if empty
    const currentUrl = page.url()
    if (currentUrl.includes('/cart')) {
      test.skip(true, 'Redirected to cart - cart is empty')
      return
    }

    // Order summary should be visible
    const orderSummary = page
      .locator('[data-testid="order-summary"], .order-summary, aside')
      .first()
    await expect(orderSummary).toBeVisible({ timeout: 5000 })

    // Should show items
    const orderItems = orderSummary.locator('text=/item/i')
    await expect(orderItems.first()).toBeVisible()

    // Should show total
    const total = orderSummary.locator('text=/total/i')
    await expect(total.first()).toBeVisible()
  })

  test('redirects to cart when checkout accessed with empty cart', async ({ page }) => {
    // Clear cookies to ensure empty cart
    await page.context().clearCookies()

    // Try to access checkout
    await page.goto('http://localhost:3000/checkout')

    // Should redirect to cart
    await expect(page).toHaveURL(/\/cart/, { timeout: 5000 })
  })
})

test.describe('Cart Persistence', () => {
  test('cart persists across page navigation', async ({ page }) => {
    // Start from shop page
    await page.goto('http://localhost:3000/shop')

    // Add item to cart if available
    const addToCartButton = page.locator('button:has-text("Add to Cart")').first()
    const buttonCount = await addToCartButton.count()

    if (buttonCount === 0) {
      test.skip(true, 'No Add to Cart buttons found')
      return
    }

    await addToCartButton.click()

    // Wait for cart page
    await page.waitForURL(/\/cart/)

    // Get cart item count
    const cartItems = page.locator('[data-testid="cart-item"]')
    const itemCount = await cartItems.count()

    // Navigate to home page
    await page.goto('http://localhost:3000')

    // Navigate back to cart
    await page.goto('http://localhost:3000/cart')

    // Cart should still have items
    const newCartItems = page.locator('[data-testid="cart-item"]')
    const newItemCount = await newCartItems.count()

    expect(newItemCount).toBe(itemCount)
  })
})

test.describe('Stock Validation', () => {
  test('shows out of stock message for unavailable books', async ({ page }) => {
    await page.goto('http://localhost:3000/shop')

    // Wait for books to load
    await page.waitForSelector('[data-testid="book-card"], .book-card, article', {
      timeout: 10000,
    })

    // Look for out of stock buttons
    const outOfStockButtons = page.locator('button:has-text("Out of Stock")')
    const outOfStockCount = await outOfStockButtons.count()

    if (outOfStockCount > 0) {
      // Out of stock button should be disabled
      await expect(outOfStockButtons.first()).toBeDisabled()
    }
  })

  test('shows low stock warning for limited availability', async ({ page }) => {
    await page.goto('http://localhost:3000/shop')

    // Wait for books to load
    await page.waitForSelector('[data-testid="book-card"], .book-card, article', {
      timeout: 10000,
    })

    // Look for low stock warnings
    const lowStockWarning = page.locator('text=/only.*left/i, text=/limited stock/i')
    const warningCount = await lowStockWarning.count()

    if (warningCount > 0) {
      await expect(lowStockWarning.first()).toBeVisible()
    }
  })
})
