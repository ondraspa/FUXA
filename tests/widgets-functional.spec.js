const { test, expect } = require('@playwright/test');

test.describe('Widgets Functional Tests', () => {

  test('editor page loads successfully', async ({ page }) => {
    const resp = await page.goto('/editor/', { waitUntil: 'commit', timeout: 10000 });
    expect(resp.status()).toBe(200);
  });

  test('editor index.html contains FUXA title', async ({ page }) => {
    const resp = await page.goto('/editor/', { waitUntil: 'commit', timeout: 10000 });
    const html = await page.content();
    expect(html).toContain('FUXA');
  });

  test('widget API works correctly', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.groups.length).toBeGreaterThanOrEqual(8);
  });

  test('all widget categories have files', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    const body = await resp.json();
    const expected = ['atex', 'classic', 'galvanoplastics', 'hvac', 'instruments', 'piping', 'pressing', 'pressing-plant'];
    const names = body.groups.map(g => g.name);
    for (const name of expected) {
      expect(names).toContain(name);
      const group = body.groups.find(g => g.name === name);
      expect(group.items.length).toBeGreaterThan(0);
    }
  });

  test('widget SVGs are valid and accessible', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    const body = await resp.json();
    for (const group of body.groups) {
      for (const item of group.items) {
        const fileResp = await request.get('/' + item.path);
        expect(fileResp.ok()).toBeTruthy();
        const text = await fileResp.text();
        expect(text).toContain('<svg');
      }
    }
  });

  test('new widget SVGs have FUXA animation integration', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    const body = await resp.json();
    const newCats = ['galvanoplastics', 'hvac', 'instruments', 'piping', 'pressing', 'pressing-plant'];
    for (const group of body.groups) {
      if (!newCats.includes(group.name)) continue;
      for (const item of group.items) {
        const fileResp = await request.get('/' + item.path);
        const text = await fileResp.text();
        expect(text).toContain('MutationObserver');
        expect(text).toContain('putValue');
        expect(text).toContain('<script');
        expect(text).toContain('!export-start');
        expect(text).toContain('data-port-id');
      }
    }
  });
});
