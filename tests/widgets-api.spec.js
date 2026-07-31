const { test, expect } = require('@playwright/test');

const EXPECTED_CATEGORIES = [
  { name: 'atex', min: 10 },
  { name: 'classic', min: 6 },
  { name: 'galvanoplastics', min: 4 },
  { name: 'hvac', min: 6 },
  { name: 'instruments', min: 6 },
  { name: 'piping', min: 6 },
  { name: 'pressing', min: 4 },
  { name: 'pressing-plant', min: 4 },
];

test.describe('Widgets API', () => {

  test('GET /api/resources/widgets returns all categories with files', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.groups).toBeDefined();
    expect(Array.isArray(body.groups)).toBeTruthy();

    const groupNames = body.groups.map(g => g.name);
    for (const cat of EXPECTED_CATEGORIES) {
      expect(groupNames).toContain(cat.name);
    }
  });

  test('each category has minimum expected files', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    const body = await resp.json();
    for (const cat of EXPECTED_CATEGORIES) {
      const group = body.groups.find(g => g.name === cat.name);
      expect(group).toBeDefined();
      expect(group.items.length).toBeGreaterThanOrEqual(cat.min);
    }
  });

  test('widget files have .svg extension and valid path', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    const body = await resp.json();
    for (const group of body.groups) {
      for (const item of group.items) {
        expect(item.name).toMatch(/\.svg$/);
        expect(item.path).toMatch(/^_widgets\//);
      }
    }
  });

  test('static widget files are accessible', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    const body = await resp.json();
    let checked = 0;
    for (const group of body.groups) {
      for (const item of group.items.slice(0, 2)) {
        const fileResp = await request.get('/' + item.path);
        expect(fileResp.ok()).toBeTruthy();
        const text = await fileResp.text();
        expect(text).toContain('<svg');
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
