#!/usr/bin/env node
/**
 * Captures UI screenshots for the README.
 * Prerequisites: npm run dev must be running on localhost:3000
 * Run: npm run screenshots
 * Install Chromium first if needed: npm run screenshots:install
 */

import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGES_DIR = path.resolve(__dirname, '..', 'docs', 'images')
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

async function main() {
  console.log('Starting screenshot capture...')
  console.log(`Target: ${BASE_URL}`)
  console.log(`Output: ${IMAGES_DIR}`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  try {
    // Navigate and wait for app to load
    const response = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 })
    if (!response || !response.ok()) {
      throw new Error(
        `Server not responding at ${BASE_URL}. Start the app with "npm run dev" first.`
      )
    }

    await page.waitForSelector('#root', { timeout: 5000 })
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500) // Allow React to render

    // 1. Org picker or get started
    await page.screenshot({ path: path.join(IMAGES_DIR, 'org-picker.png'), fullPage: true })
    console.log('  - org-picker.png')

    // 2. Click Open on first org if available
    const openBtn = page.getByRole('button', { name: 'Open' }).first()
    const openVisible = await openBtn.isVisible().catch(() => false)
    if (openVisible) {
      await openBtn.click()
      await page.waitForTimeout(800)
    }

    // 3. Applications view
    await page.screenshot({ path: path.join(IMAGES_DIR, 'applications.png'), fullPage: true })
    console.log('  - applications.png')

    // 4. Comparison
    const comparisonBtn = page.getByRole('button', { name: 'Comparison' })
    if (await comparisonBtn.isVisible().catch(() => false)) {
      await comparisonBtn.click()
      await page.waitForTimeout(600)
    }
    await page.screenshot({ path: path.join(IMAGES_DIR, 'comparison.png'), fullPage: true })
    console.log('  - comparison.png')

    // 5. Teams
    const teamsBtn = page.getByRole('button', { name: 'Teams' })
    if (await teamsBtn.isVisible().catch(() => false)) {
      await teamsBtn.click()
      await page.waitForTimeout(600)
    }
    await page.screenshot({ path: path.join(IMAGES_DIR, 'teams.png'), fullPage: true })
    console.log('  - teams.png')

    // 6. Docs
    const docsBtn = page.getByRole('button', { name: 'Docs' })
    if (await docsBtn.isVisible().catch(() => false)) {
      await docsBtn.click()
      await page.waitForTimeout(600)
    }
    await page.screenshot({ path: path.join(IMAGES_DIR, 'docs.png'), fullPage: true })
    console.log('  - docs.png')

    // 7. Application detail - go back to Applications and click first app card if any
    const applicationsBtn = page.getByRole('button', { name: 'Applications' })
    if (await applicationsBtn.isVisible().catch(() => false)) {
      await applicationsBtn.click()
      await page.waitForTimeout(800)
    }
    // Try to click first app (cards have type badge: Custom, SaaS, or COTS)
    const appCard = page.locator('div').filter({ hasText: /Custom|SaaS|COTS/ }).first()
    if (await appCard.isVisible().catch(() => false)) {
      await appCard.click()
      await page.waitForTimeout(600)
      await page.screenshot({ path: path.join(IMAGES_DIR, 'application-detail.png'), fullPage: true })
      console.log('  - application-detail.png')
    } else {
      // No apps - capture empty applications view as application-detail fallback
      await page.screenshot({ path: path.join(IMAGES_DIR, 'application-detail.png'), fullPage: true })
      console.log('  - application-detail.png (no apps; used applications view)')
    }

    // 8. Search overlay - focus search, type, capture
    const searchInput = page.getByPlaceholder(/Search organizations/)
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.click()
      await searchInput.fill('test')
      await page.waitForTimeout(800) // Wait for search results/overlay
      await page.screenshot({ path: path.join(IMAGES_DIR, 'search-overlay.png'), fullPage: true })
      console.log('  - search-overlay.png')
    } else {
      await page.screenshot({ path: path.join(IMAGES_DIR, 'search-overlay.png'), fullPage: true })
      console.log('  - search-overlay.png (search bar may not be visible)')
    }
  } catch (err) {
    if (err.message?.includes('net::ERR_CONNECTION_REFUSED') || err.message?.includes('fetch')) {
      console.error('\nError: Cannot connect to', BASE_URL)
      console.error('Make sure the app is running: npm run dev')
      console.error('If Chromium is not installed: npm run screenshots:install')
    } else {
      console.error('\nError:', err.message)
    }
    process.exit(1)
  } finally {
    await browser.close()
  }

  console.log('\nScreenshots saved to docs/images/')
}

main()
