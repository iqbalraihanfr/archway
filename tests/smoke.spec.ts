import { test, expect } from '@playwright/test';

test.describe('Archway E2E Smoke Tests', () => {
  test('should load dashboard and create a new project', async ({ page }) => {
    // 1. Load Dashboard
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Archway/i);
    
    // Wait for either the "No recent workspace" text or the project list to be ready
    await page.waitForTimeout(2000); 

    // 2. Click Create Project
    const createBtn = page.getByRole('button', { name: /new project/i }).first();
    await createBtn.waitFor({ state: 'visible', timeout: 15000 });
    await createBtn.click();
    
    // 3. Fill Project Details
    const projectName = `Test Project ${Date.now()}`;
    await page.getByLabel(/project name/i).fill(projectName);
    
    // Select Template
    const templateBtn = page.getByRole('button', { name: /full architecture/i });
    await templateBtn.click();
    
    // 4. Submit
    const submitBtn = page.getByRole('button', { name: /create workspace/i });
    await submitBtn.click();
    
    // 5. Verify Workspace loads
    await expect(page).toHaveURL(/\/workspace\//, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText(projectName, { timeout: 10000 });
    
    // 6. Verify React Flow Canvas is present
    await expect(page.locator('.react-flow__renderer')).toBeVisible({ timeout: 10000 });
  });

  test('should interact with editor panel', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const createBtn = page.getByRole('button', { name: /new project/i }).first();
    await createBtn.click();
    
    await page.getByLabel(/project name/i).fill('Editor Test');
    await page.getByRole('button', { name: /create workspace/i }).click();
    
    await expect(page).toHaveURL(/\/workspace\//, { timeout: 15000 });
    
    // Wait for nodes to be rendered
    const node = page.locator('.react-flow__node').filter({ hasText: 'Project Brief' }).first();
    await node.waitFor({ state: 'visible', timeout: 10000 });
    await node.click();
    
    // Check if editor panel is visible
    await expect(page.locator('aside')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Project Brief');
  });

  test('should handle project deletion', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const projectName = `Delete Me ${Date.now()}`;
    
    // Create project
    await page.getByRole('button', { name: /new project/i }).first().click();
    await page.getByLabel(/project name/i).fill(projectName);
    await page.getByRole('button', { name: /create workspace/i }).click();
    
    await expect(page).toHaveURL(/\/workspace\//, { timeout: 15000 });

    // Go back to dashboard - using the "ARCHWAY" logo/link or back button if available
    // WorkspaceHeader has a back button or link
    await page.goto('/'); 
    
    // Find the project card and delete it
    const card = page.locator('.group\\/card').filter({ hasText: projectName });
    await card.waitFor({ state: 'visible', timeout: 10000 });
    await card.getByRole('button', { name: /delete project/i }).click();
    
    // Confirm deletion
    const confirmBtn = page.getByRole('button', { name: /^delete project$/i });
    await confirmBtn.waitFor({ state: 'visible' });
    await confirmBtn.click();
    
    // Verify it's gone
    await expect(card).not.toBeVisible({ timeout: 10000 });
  });
});
