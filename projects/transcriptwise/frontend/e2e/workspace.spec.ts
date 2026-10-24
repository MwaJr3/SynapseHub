import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs/promises'

const TEXT =
  'Active recall is the practice of retrieving information from memory. Spaced repetition means revisiting information over increasing intervals. Feedback is information used to compare current performance with a desired result. You should check your understanding against the source, and practice explaining the central idea in your own words. First, study a short passage. Next, close your notes and recall the idea. Finally, check what you missed.'
async function section(page: Page, key: string, label: string) {
  const mobile = page.getByLabel('Explore this guide')
  if (await mobile.isVisible()) await mobile.selectOption(key)
  else
    await page
      .getByRole('navigation', { name: 'Learning guide sections' })
      .getByRole('button', { name: label, exact: false })
      .click()
  await expect(page.locator('.reading-heading h2')).toHaveText(label)
}
async function sampleGuide(page: Page, title: string) {
  await page.goto('/new?sample=1')
  await page.getByRole('button', { name: 'Review transcript', exact: true }).click()
  await page.waitForURL('**/review/**')
  await page.getByLabel('Guide title', { exact: true }).fill(title)
  await page.getByRole('button', { name: 'Create learning guide' }).click()
  await page.waitForURL('**/guide/**')
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
  return page.url()
}
async function noOverflow(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}
const pageErrors = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  pageErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
})
test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([])
})

test('paste → review edits → preferences → source-linked guide → quiz → flashcard → persisted notes', async ({
  page,
}) => {
  await page.goto('/new?method=paste')
  await page.getByLabel('Guide title (optional)').fill('Understanding learning methods')
  await page.getByLabel('Transcript text').fill(TEXT)
  await page.getByRole('button', { name: 'Review transcript', exact: true }).click()
  await page.waitForURL('**/review/**')
  const input = page.getByLabel('Transcript segment 1', { exact: true })
  await input.fill(TEXT + ' Confidence is not the same thing as accuracy.')
  await page.getByText('Advanced', { exact: true }).click()
  await page.getByLabel('What’s your learning goal?').selectOption('exam')
  await page.getByRole('button', { name: 'Save review', exact: true }).click()
  await expect(page.getByText('Transcript review saved. The original is preserved.')).toBeVisible()
  await noOverflow(page)
  await page.getByRole('button', { name: 'Create learning guide' }).click()
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
  const guideUrl = page.url()
  await expect(page.getByText('Local extractive mode.', { exact: true })).toBeVisible()
  await page.locator('.source-refs button').first().click()
  await expect(page.getByRole('heading', { name: 'Original transcript', exact: true })).toBeVisible()
  await expect(page.locator('.source-passage.focused')).toContainText(
    'Confidence is not the same thing as accuracy.',
  )
  await section(page, 'quiz', 'Practice quiz')
  const questions = page.locator('fieldset.quiz-question')
  for (let i = 0; i < (await questions.count()); i++) {
    const question = questions.nth(i)
    if (await question.getByRole('radio').count()) await question.getByRole('radio').first().check()
    else
      await question
        .getByRole('textbox')
        .fill('I would compare my recalled explanation with the source, then correct missing qualifications.')
  }
  await page.getByRole('button', { name: 'Check my understanding' }).click()
  await expect(page.getByText(/objective answers correct/)).toBeVisible()
  await section(page, 'flashcards', 'Flashcards')
  await page.getByRole('button', { name: /Reveal answer/ }).click()
  await expect(page.getByRole('heading', { name: 'The source says…' })).toBeVisible()
  await page.getByRole('button', { name: /^Easy/ }).click()
  await expect(page.getByText(/Review recorded. Next practice:/)).toBeVisible()
  await section(page, 'personal', 'Personal notes')
  await page
    .getByLabel('Your personal notes')
    .fill('My next step: explain the source without looking, then check the qualifications.')
  await page.getByRole('button', { name: 'Save notes', exact: true }).click()
  await page.reload()
  await expect(page.getByLabel('Your personal notes')).toHaveValue(
    'My next step: explain the source without looking, then check the qualifications.',
  )
  await noOverflow(page)
  await page.goto(guideUrl)
  await page.getByLabel('Edit this section').click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('textbox', { name: 'Content', exact: true })
    .first()
    .fill('A source-connected note edited by the learner.')
  await dialog.getByRole('button', { name: 'Save section' }).click()
  await expect(page.getByText('User-edited note', { exact: true })).toBeVisible()
  await expect(
    page.getByText('A source-connected note edited by the learner.', { exact: true }),
  ).toBeVisible()
  await page.getByLabel('Copy this section').click()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('A source-connected note edited by the learner.')
  await page.getByLabel('Regenerate only this section').click()
  await page.getByRole('dialog').getByRole('button', { name: 'Regenerate section' }).click()
  await expect(page.getByText('A source-connected note edited by the learner.', { exact: true })).toHaveCount(
    0,
  )
  await expect(page.getByRole('heading', { name: 'Opening ideas · source excerpt' })).toBeVisible()
})

test('register → save → organize → sign in → export all formats → delete guide and account', async ({
  page,
}, info) => {
  const title = `Learning lab ${info.project.name} ${Date.now()}`
  const url = await sampleGuide(page, title)
  const email = `learner-${Date.now()}@example.test`
  await page.getByRole('button', { name: 'Save guide', exact: true }).click()
  const auth = page.getByRole('dialog')
  await auth.getByLabel('Your name').fill('Test Learner')
  await auth.getByLabel('Email address', { exact: true }).fill(email)
  await auth.getByLabel('Password', { exact: true }).fill('test-only-long-password-123')
  await auth.getByRole('button', { name: 'Create your account' }).click()
  await expect(page.getByRole('button', { name: 'Saved to library', exact: true })).toBeVisible()
  await page.getByLabel('Guide options').click()
  await page.getByRole('button', { name: 'Rename & organize' }).click()
  const manage = page.getByRole('dialog')
  await manage.getByLabel('Folder', { exact: true }).fill('Learning science')
  await manage.getByLabel('Tags', { exact: true }).fill('recall, practice')
  await manage.getByRole('button', { name: 'Save details' }).click()
  await expect(page.getByText('Guide details saved.')).toBeVisible()
  await page.goto('/library')
  await page.getByRole('searchbox', { name: 'Search your library' }).fill(title)
  await page.getByLabel('Filter by folder').selectOption('Learning science')
  await page.getByRole('tab', { name: 'Saved', exact: true }).click()
  await page.getByRole('heading', { name: title, exact: true }).getByRole('link').click()
  await expect(page).toHaveURL(url)
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL('http://127.0.0.1:5174/')
  await page.goto('/library')
  await expect(page.getByRole('heading', { name: 'Your next discovery starts here.' })).toBeVisible()
  await page.getByRole('button', { name: 'Create an account', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Email address', { exact: true }).fill(email)
  await page.getByRole('dialog').getByLabel('Password', { exact: true }).fill('test-only-long-password-123')
  await page.getByRole('dialog').getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await page.getByRole('heading', { name: title, exact: true }).getByRole('link').click()
  await expect(page).toHaveURL(url)
  await page.getByText('Export', { exact: true }).click()
  await page.getByRole('button', { name: 'Copy complete guide' }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain(title)
  // Close the native disclosure if the copy operation left it open.
  await page.locator('details.export-dropdown').evaluate((element) => {
    ;(element as HTMLDetailsElement).open = false
  })
  for (const [label, extension] of [
    ['Markdown (.md)', '.md'],
    ['Word document (.docx)', '.docx'],
    ['Structured data (.json)', '.json'],
  ]) {
    await page.getByText('Export', { exact: true }).click()
    const wait = page.waitForEvent('download')
    await page.getByRole('button', { name: label, exact: true }).click()
    const download = await wait
    expect(download.suggestedFilename()).toContain(extension)
    const downloaded = await download.path()
    expect((await fs.stat(downloaded!)).size).toBeGreaterThan(100)
    if (extension === '.json') {
      const data = JSON.parse(await fs.readFile(downloaded!, 'utf8'))
      expect(data.analysis.is_saved).toBe(true)
      expect(data.transcript.original_text).toContain('Active recall')
      expect(data.format_version).toBe('1.0')
    }
  }
  await page.getByText('Export', { exact: true }).click()
  const popup = page.waitForEvent('popup')
  await page.getByRole('link', { name: 'Print view / save as PDF' }).click()
  const printPage = await popup
  await expect(printPage.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await expect(printPage.locator('script')).toHaveCount(0)
  await printPage.close()
  await page.locator('details.export-dropdown').evaluate((element) => {
    ;(element as HTMLDetailsElement).open = false
  })
  await page.getByLabel('Guide options').click()
  await page.getByRole('button', { name: 'Delete guide', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete guide', exact: true }).click()
  await expect(page).toHaveURL(/\/library$/)
  await expect(page.getByRole('heading', { name: 'Your next discovery starts here.' })).toBeVisible()
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Delete account & all data' }).click()
  const deletion = page.getByRole('dialog')
  await deletion.getByLabel('I understand this cannot be undone.').check()
  await deletion.getByLabel('Current password').fill('incorrect-password')
  await deletion.getByRole('button', { name: 'Permanently delete' }).click()
  await expect(
    deletion.getByText('Enter your current password to delete your account and all its data.'),
  ).toBeVisible()
  await deletion.getByLabel('Current password').fill('test-only-long-password-123')
  await deletion.getByRole('button', { name: 'Permanently delete' }).click()
  await expect(page).toHaveURL('http://127.0.0.1:5174/')
  await expect(page.getByRole('heading', { name: 'What will you learn today?' })).toBeVisible()
  const sessionResponse = await page.request.get('/api/v1/session')
  expect((await sessionResponse.json()).user.is_guest).toBe(true)
})

test('uploads and parses actual subtitle files with real timestamps', async ({ page }) => {
  await page.goto('/new?method=upload')
  await page.getByLabel('Choose transcript file').setInputFiles({
    name: 'memory-lesson.srt',
    mimeType: 'text/plain',
    buffer: Buffer.from(`1\n00:00:01,500 --> 00:00:12,000\n${TEXT}\n`),
  })
  await page.getByRole('button', { name: 'Review transcript', exact: true }).click()
  await expect(page.getByLabel('Transcript segment 1 at 00:01')).toHaveValue(TEXT)
  await page.getByRole('button', { name: 'Create learning guide' }).click()
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
  await expect(page.locator('.source-refs').first()).toContainText('00:01')
  await noOverflow(page)
})

test('unavailable YouTube retrieval offers manual fallbacks and never inserts sample content', async ({
  page,
}) => {
  const task = {
    id: 'retrieval-fixture',
    kind: 'retrieve',
    status: 'failed',
    message: 'Caption access was not authorized. Paste or upload a transcript to continue.',
    error_code: 'access_not_authorized',
    result: { metadata: { title: 'Requested video fixture' } },
    total_units: 0,
    completed_units: 0,
  }
  await page.route('**/api/v1/youtube/retrieve', (route) =>
    route.fulfill({ json: { ...task, status: 'queued' }, status: 202 }),
  )
  await page.route('**/api/v1/tasks/retrieval-fixture', (route) => route.fulfill({ json: task }))
  await page.goto('/new')
  await page.getByLabel('YouTube video URL').fill('https://youtu.be/dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Get transcript' }).click()
  await expect(page.getByRole('alert')).toContainText('not authorized')
  await page.getByRole('button', { name: 'Paste transcript instead' }).click()
  await expect(page.getByLabel('Transcript text')).toHaveValue('')
  await expect(page.getByLabel('Guide title (optional)')).toHaveValue('')
  await expect(page).toHaveURL(/\/new$/)
})

test('themes, responsive navigation, landing and help work without overflow', async ({ page }, info) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'What will you learn today?' })).toBeVisible()
  await page.getByLabel('Change color theme').click()
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await expect(page.locator('html')).toHaveClass('dark')
  await page.reload()
  await expect(page.locator('html')).toHaveClass('dark')
  await page.getByLabel('Change color theme').click()
  await page.getByRole('button', { name: 'System', exact: true }).click()
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).not.toHaveClass('dark')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveClass('dark')
  await noOverflow(page)
  if (info.project.name.includes('mobile')) {
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.getByRole('dialog').getByRole('link', { name: 'Settings', exact: true }).click()
  } else await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Make yourself at home.' })).toBeVisible()
  await noOverflow(page)
  await page.getByRole('button', { name: /^Light/ }).click()
  await expect(page.locator('html')).not.toHaveClass('dark')
  await page.goto('/about')
  await expect(page.getByRole('heading', { name: /Turn YouTube videos/ })).toBeVisible()
  await noOverflow(page)
  await page.goto('/help')
  await page.getByText('Why can’t every YouTube transcript be retrieved?', { exact: true }).click()
  await expect(page.getByText(/Public visibility is not permission/)).toBeVisible()
  await noOverflow(page)
})

test('keyboard access and automated accessibility checks cover light and dark home, review and guide', async ({
  page,
}, info) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'What will you learn today?' })).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  for (const theme of ['Light', 'Dark']) {
    await page.getByLabel('Change color theme').click()
    await page.getByRole('button', { name: theme, exact: true }).click()
    if (process.env.TW_CAPTURE_SCREENSHOTS === '1') {
      await page.evaluate(() => {
        ;(document.activeElement as HTMLElement | null)?.blur()
        window.scrollTo({ top: 0, behavior: 'instant' })
      })
      await page.screenshot({
        path: `../docs/screenshots/workspace-${theme.toLowerCase()}-${info.project.name}.png`,
        fullPage: true,
        animations: 'disabled',
      })
    }
    const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(
      report.violations,
      JSON.stringify(report.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))),
    ).toEqual([])
  }
  await page.goto('/new?sample=1')
  await page.getByRole('button', { name: 'Review transcript', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Review your transcript' })).toBeVisible()
  let report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(
    report.violations,
    JSON.stringify(report.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))),
  ).toEqual([])
  await page.getByRole('button', { name: 'Create learning guide' }).click()
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible()
  for (const theme of ['Light', 'Dark']) {
    await page.getByLabel('Change color theme').click()
    await page.getByRole('button', { name: theme, exact: true }).click()
    for (const [key, label] of [
      ['overview', 'Overview'],
      ['quiz', 'Practice quiz'],
      ['flashcards', 'Flashcards'],
      ['personal', 'Personal notes'],
    ]) {
      await section(page, key, label)
      if (key === 'overview' && process.env.TW_CAPTURE_SCREENSHOTS === '1') {
        await page.evaluate(() => {
          ;(document.activeElement as HTMLElement | null)?.blur()
          window.scrollTo({ top: 0, behavior: 'instant' })
        })
        await page.screenshot({
          path: `../docs/screenshots/guide-${theme.toLowerCase()}-${info.project.name}.png`,
          fullPage: true,
          animations: 'disabled',
        })
      }
      report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      expect(
        report.violations,
        JSON.stringify(report.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))),
      ).toEqual([])
    }
  }
})
