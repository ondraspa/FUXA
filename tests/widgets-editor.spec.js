const { test, expect } = require('@playwright/test');

const NEW_CATEGORIES = ['galvanoplastics', 'hvac', 'instruments', 'piping', 'pressing', 'pressing-plant'];

test.describe('Widgets Editor Integration', () => {

  test('editor page loads successfully', async ({ page }) => {
    const resp = await page.goto('/');
    expect(resp.status()).toBe(200);
    await expect(page).toHaveTitle(/FUXA/i);
  });

  test('widget SVG files are accessible', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    const body = await resp.json();
    for (const group of body.groups) {
      for (const item of group.items) {
        const fileResp = await request.get('/' + item.path);
        expect(fileResp.ok()).toBeTruthy();
        const content = await fileResp.text();
        expect(content).toContain('<svg');
      }
    }
  });

  test('new widget SVGs have FUXA animation integration', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    const body = await resp.json();
    for (const group of body.groups) {
      if (!NEW_CATEGORIES.includes(group.name)) continue;
      for (const item of group.items) {
        const fileResp = await request.get('/' + item.path);
        const content = await fileResp.text();
        expect(content).toContain('MutationObserver');
        expect(content).toContain('putValue');
        expect(content).toContain('<script');
        expect(content).toContain('!export-start');
        expect(content).toContain('data-port-id');
      }
    }
  });
});
