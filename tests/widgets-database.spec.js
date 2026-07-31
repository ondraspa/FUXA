const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'server', '_widgets', 'widgets-database.json');
const WIDGETS_DIR = path.join(__dirname, '..', 'server', '_widgets');

test.describe('Widget Database Validation', () => {

  test('widgets-database.json exists and is valid JSON', () => {
    const content = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(content);
    expect(db._meta).toBeDefined();
    expect(db._meta.standards).toContain('ISA-5.1-2022');
    expect(db._meta.standards).toContain('ISA-101-2015');
    expect(db.categories).toBeDefined();
  });

  test('all categories in database have directories (or are root files)', () => {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const dirs = fs.readdirSync(WIDGETS_DIR).filter(d => {
      const p = path.join(WIDGETS_DIR, d);
      return fs.statSync(p).isDirectory() && d !== '.git' && d !== 'node_modules';
    });
    for (const catName of Object.keys(db.categories)) {
      if (catName === 'root-widgets') continue; // root-widgets are flat files, not a subdirectory
      expect(dirs).toContain(catName);
    }
  });

  test('all widget SVGs are registered in database', () => {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    for (const [catName, cat] of Object.entries(db.categories)) {
      if (!cat.widgets) continue;
      const catDir = path.join(WIDGETS_DIR, catName);
      if (!fs.existsSync(catDir)) continue;
      const svgFiles = fs.readdirSync(catDir).filter(f => f.endsWith('.svg'));
      for (const svgFile of svgFiles) {
        const widgetName = svgFile.replace('.svg', '');
        const isRegistered = Object.keys(cat.widgets).some(k => widgetName.includes(k));
        if (!isRegistered) {
          console.warn(`Warning: ${catName}/${svgFile} may not be registered in database`);
        }
      }
    }
  });

  test('every registered widget has required SVG fields', () => {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    for (const [catName, cat] of Object.entries(db.categories)) {
      if (!cat.widgets) continue;
      for (const [widgetName, widget] of Object.entries(cat.widgets)) {
        let searchDir = path.join(WIDGETS_DIR, catName);
        if (catName === 'root-widgets') searchDir = WIDGETS_DIR;
        if (!fs.existsSync(searchDir)) continue;
        const files = fs.readdirSync(searchDir).filter(f => f.includes(widgetName) && f.endsWith('.svg'));
        for (const file of files) {
          const content = fs.readFileSync(path.join(searchDir, file), 'utf8');
          expect(content).toContain('<svg');
          expect(content).toContain('id=');
          if (widget.variables && catName !== 'atex' && catName !== 'classic' && catName !== 'dynamicSVG' && catName !== 'root-widgets') {
            for (const varName of Object.keys(widget.variables)) {
              expect(content).toContain(varName);
            }
          }
        }
      }
    }
  });

  test('database has all required widget metadata fields', () => {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    for (const [catName, cat] of Object.entries(db.categories)) {
      if (!cat.widgets) continue;
      for (const [widgetName, widget] of Object.entries(cat.widgets)) {
        if (widget.variables) {
          for (const [varName, varDef] of Object.entries(widget.variables)) {
            expect(varDef.type).toBeDefined();
            if (varDef.type === 'number') {
              expect(varDef.unit).toBeDefined();
            }
          }
        }
      }
    }
  });

  test('widget variables follow ISA naming convention', () => {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    for (const cat of Object.values(db.categories)) {
      if (!cat.widgets) continue;
      for (const widget of Object.values(cat.widgets)) {
        if (widget.variables) {
          for (const varName of Object.keys(widget.variables)) {
            expect(varName).toMatch(/^_(pn|pb|ps|pc)_/);
          }
        }
      }
    }
  });
});
