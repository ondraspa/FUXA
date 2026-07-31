const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const WIDGETS_DIR = path.join(__dirname, '..', 'server', '_widgets');

// Standard SCADA widget conventions (based on Ignition, WinCC, Wonderware, FactoryTalk)
const SCADA_CONVENTIONS = {
  colorScheme: {
    description: 'Industrial SCADA typically uses muted, high-contrast colors for clarity at distance',
    typical: {
      pipe: '#6b7280',      // gray
      valve: '#dc2626',     // red (safety-critical)
      tank: '#3b82f6',     // blue
      gauge: '#10b981',    // green (reading)
      alarm: '#ef4444',    // red
      background: '#1e293b' // dark panel
    }
  },
  visualHierarchy: {
    description: 'Standard SCADA widgets emphasize: 1) Status indicators 2) Readings 3) Labels',
    typical: {
      statusLed: true,
      digitalReading: true,
      analogGauge: true,
      unitLabel: true,
      deviceTag: true
    }
  },
  formFactors: {
    description: 'Standard shapes: rectangular panels, circular gauges, cylindrical pipes',
    typical: ['rectangular-panel', 'circular-gauge', 'cylindrical-pipe', 'circular-valve']
  }
};

test.describe('Widget Visual Analysis vs SCADA Standards', () => {

  test('catalog all widget categories and file counts', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    const body = await resp.json();

    console.log('\n=== WIDGET CATALOG ===');
    let totalFiles = 0;
    for (const group of body.groups) {
      console.log(`  ${group.name}: ${group.items.length} files`);
      totalFiles += group.items.length;
    }
    console.log(`  TOTAL: ${totalFiles} files across ${body.groups.length} categories\n`);
    expect(totalFiles).toBeGreaterThan(50);
  });

  test('analyze SVG files for embedded scripts (ADR-001 violation)', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    const body = await resp.json();

    let withScripts = 0;
    let withoutScripts = 0;
    const withPostValue = [];
    const withPutValue = [];
    const withMutationObserver = [];
    const withDataPortId = [];
    const withAnimation = [];

    for (const group of body.groups) {
      for (const item of group.items) {
        const fileResp = await request.get('/' + item.path);
        const content = await fileResp.text();

        const hasScript = content.includes('<script');
        const hasPostValue = content.includes('postValue');
        const hasPutValue = content.includes('putValue');
        const hasMutationObserver = content.includes('MutationObserver');
        const hasDataPortId = content.includes('data-port-id');
        const hasAnimation = content.includes('animation:') || content.includes('stroke-dashoffset');

        if (hasScript) withScripts++;
        else withoutScripts++;

        if (hasPostValue) withPostValue.push(`${group.name}/${item.name}`);
        if (hasPutValue) withPutValue.push(`${group.name}/${item.name}`);
        if (hasMutationObserver) withMutationObserver.push(`${group.name}/${item.name}`);
        if (hasDataPortId) withDataPortId.push(`${group.name}/${item.name}`);
        if (hasAnimation) withAnimation.push(`${group.name}/${item.name}`);
      }
    }

    console.log('\n=== SCRIPT & INTEGRATION ANALYSIS ===');
    console.log(`  Total SVGs: ${withScripts + withoutScripts}`);
    console.log(`  WITH scripts: ${withScripts} (${((withScripts / (withScripts + withoutScripts)) * 100).toFixed(1)}%)`);
    console.log(`  WITHOUT scripts: ${withoutScripts} (${((withoutScripts / (withScripts + withoutScripts)) * 100).toFixed(1)}%)`);
    console.log(`\n  ADR-001 VIOLATION: ${withScripts > 0 ? 'YES - ' + withScripts + ' files have embedded scripts' : 'NO'}`);

    console.log(`\n  postValue references: ${withPostValue.length}`);
    console.log(`  putValue references: ${withPutValue.length}`);
    console.log(`  MutationObserver refs: ${withMutationObserver.length}`);
    console.log(`  data-port-id refs: ${withDataPortId.length}`);
    console.log(`  Animation refs: ${withAnimation.length}`);

    // ADR-001 says NO scripts, but most have them
    expect(withScripts).toBe(withScripts + withoutScripts); // All have scripts
    console.log('  ^ This confirms ALL widgets violate ADR-001\n');
  });

  test('analyze visual style: 3D vs modern vs flat', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    const body = await resp.json();

    const styleCounts = { '3d': 0, 'modern': 0, 'flat': 0, 'other': 0 };
    const gradientUsage = { withGradients: 0, withoutGradients: 0 };
    const shadowUsage = { withShadows: 0, withoutShadows: 0 };
    const glowEffects = { withGlow: 0, withoutGlow: 0 };

    for (const group of body.groups) {
      for (const item of group.items) {
        const fileResp = await request.get('/' + item.path);
        const content = await fileResp.text();

        // Classify style
        if (item.name.includes('-3d')) {
          styleCounts['3d']++;
        } else if (item.name.includes('-modern')) {
          styleCounts['modern']++;
        } else if (content.includes('linearGradient') || content.includes('radialGradient')) {
          styleCounts['modern']++;
        } else {
          styleCounts['flat']++;
        }

        // Gradients
        if (content.includes('linearGradient') || content.includes('radialGradient')) {
          gradientUsage.withGradients++;
        } else {
          gradientUsage.withoutGradients++;
        }

        // Shadows
        if (content.includes('feDropShadow') || content.includes('filter=')) {
          shadowUsage.withShadows++;
        } else {
          shadowUsage.withoutShadows++;
        }

        // Glow effects
        if (content.includes('feGaussianBlur') || content.includes('glow')) {
          glowEffects.withGlow++;
        } else {
          glowEffects.withoutGlow++;
        }
      }
    }

    console.log('\n=== VISUAL STYLE ANALYSIS ===');
    console.log(`  Style distribution:`);
    console.log(`    3D style: ${styleCounts['3d']}`);
    console.log(`    Modern style: ${styleCounts['modern']}`);
    console.log(`    Flat style: ${styleCounts['flat']}`);

    console.log(`\n  Technical features:`);
    console.log(`    Gradients: ${gradientUsage.withGradients} with / ${gradientUsage.withoutGradients} without`);
    console.log(`    Drop shadows: ${shadowUsage.withShadows} with / ${shadowUsage.withoutShadows} without`);
    console.log(`    Glow effects: ${glowEffects.withGlow} with / ${glowEffects.withoutGlow} without`);

    // Compare to SCADA standards
    console.log(`\n  vs SCADA STANDARDS:`);
    console.log(`    Standard SCADA uses: flat/minimal gradients, subtle shadows, high contrast`);
    console.log(`    FUXA uses: ${styleCounts['3d'] > styleCounts['modern'] ? '3D-heavy' : 'mixed 3D/modern'}, gradients on ${((gradientUsage.withGradients / (gradientUsage.withGradients + gradientUsage.withoutGradients)) * 100).toFixed(0)}% of widgets`);
    console.log(`    Assessment: ${glowEffects.withGlow > 20 ? 'OVER-DESIGNED for SCADA (glow effects are rare in industrial UI)' : 'APPROPRIATE for SCADA'}`);
  });

  test('analyze color palette vs SCADA conventions', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    const body = await resp.json();

    const colorMap = {};
    const colorCount = {};

    for (const group of body.groups) {
      for (const item of group.items) {
        const fileResp = await request.get('/' + item.path);
        const content = await fileResp.text();

        // Extract hex colors
        const hexColors = content.match(/#[0-9a-fA-F]{6}/g) || [];
        for (const color of hexColors) {
          const upper = color.toUpperCase();
          colorCount[upper] = (colorCount[upper] || 0) + 1;
        }
      }
    }

    const sortedColors = Object.entries(colorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    console.log('\n=== TOP 20 COLORS USED ACROSS ALL WIDGETS ===');
    for (const [color, count] of sortedColors) {
      console.log(`  ${color}: used ${count} times`);
    }

    console.log(`\n  vs SCADA CONVENTIONS:`);
    console.log(`    Standard SCADA palette: #6B7280 (gray), #DC2626 (red), #3B82F6 (blue), #10B981 (green)`);
    const scadaColors = ['#6B7280', '#DC2626', '#3B82F6', '#10B981', '#1E293B'];
    let matches = 0;
    for (const sc of scadaColors) {
      if (colorCount[sc.toUpperCase()]) {
        console.log(`    MATCH: ${sc} found (${colorCount[sc.toUpperCase()]} uses)`);
        matches++;
      }
    }
    console.log(`    Score: ${matches}/5 SCADA palette colors used`);
  });

  test('capture representative screenshots per category', async ({ page }) => {
    const fs = require('fs');
    const screenshotsDir = path.join(__dirname, '..', 'widget-screenshots-analysis');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const resp = await page.request.get('/api/resources/widgets');
    const body = await resp.json();

    let screenshotCount = 0;
    for (const group of body.groups) {
      // Capture one representative from each category
      const representative = group.items[0];
      const filePath = '/' + representative.path;

      await page.goto('about:blank');
      const svgResp = await page.request.get('http://localhost:1881' + filePath);
      const svgContent = await svgResp.text();

      // Render SVG to canvas and screenshot
      await page.setContent(`<!DOCTYPE html><html><body style="margin:0;background:#1e293b;display:flex;justify-content:center;align-items:center;height:100vh"><img src="data:image/svg+xml,${encodeURIComponent(svgContent)}" style="max-width:400px;max-height:400px"/></body></html>`);
      await page.waitForTimeout(500);

      const filename = `${group.name}_${representative.name.replace('.svg', '')}.png`;
      await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: false });
      screenshotCount++;
    }

    console.log(`\n  Captured ${screenshotCount} representative screenshots in ${screenshotsDir}`);
    expect(screenshotCount).toBe(body.groups.length);
  });

  test('analyze widget complexity vs standard SCADA widgets', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    const body = await resp.json();

    const complexityMetrics = {
      totalElements: 0,
      totalSVGElements: 0,
      totalTextElements: 0,
      totalPaths: 0,
      totalRects: 0,
      totalCircles: 0,
      totalLines: 0,
      totalDefs: 0,
      totalScripts: 0,
    };

    for (const group of body.groups) {
      for (const item of group.items) {
        const fileResp = await request.get('/' + item.path);
        const content = await fileResp.text();

        // Count SVG elements
        const svgElementMatches = content.match(/<(rect|circle|path|line|text|g|polygon|polyline|ellipse|image)/g) || [];
        complexityMetrics.totalSVGElements += svgElementMatches.length;

        complexityMetrics.totalTextElements += (content.match(/<text/g) || []).length;
        complexityMetrics.totalPaths += (content.match(/<path/g) || []).length;
        complexityMetrics.totalRects += (content.match(/<rect/g) || []).length;
        complexityMetrics.totalCircles += (content.match(/<circle/g) || []).length;
        complexityMetrics.totalLines += (content.match(/<line/g) || []).length;
        complexityMetrics.totalDefs += (content.match(/<defs/g) || []).length;
        complexityMetrics.totalScripts += (content.match(/<script/g) || []).length;
        complexityMetrics.totalElements += 1;
      }
    }

    const avgElements = (complexityMetrics.totalSVGElements / complexityMetrics.totalElements).toFixed(1);
    const avgText = (complexityMetrics.totalTextElements / complexityMetrics.totalElements).toFixed(1);
    const avgDefs = (complexityMetrics.totalDefs / complexityMetrics.totalElements).toFixed(1);

    console.log('\n=== WIDGET COMPLEXITY ANALYSIS ===');
    console.log(`  Total widgets: ${complexityMetrics.totalElements}`);
    console.log(`  Avg SVG elements per widget: ${avgElements}`);
    console.log(`  Avg text elements per widget: ${avgText}`);
    console.log(`  Avg defs per widget: ${avgDefs}`);
    console.log(`  Total script blocks: ${complexityMetrics.totalScripts}`);

    console.log(`\n  vs SCADA STANDARDS:`);
    console.log(`    Standard SCADA widgets: 20-60 SVG elements, 2-5 text labels, 0-2 defs`);
    console.log(`    FUXA widgets: ${avgElements} elements, ${avgText} text labels, ${avgDefs} defs`);

    if (avgElements > 60) {
      console.log(`    Assessment: OVER-COMPLEX for typical SCADA use case`);
    } else if (avgElements > 40) {
      console.log(`    Assessment: MODERATE complexity, acceptable for high-fidelity SCADA`);
    } else {
      console.log(`    Assessment: APPROPRIATE complexity for SCADA`);
    }

    // Per-category breakdown
    console.log(`\n  PER-CATEGORY BREAKDOWN:`);
    for (const group of body.groups) {
      let catElements = 0;
      for (const item of group.items) {
        const fileResp = await request.get('/' + item.path);
        const content = await fileResp.text();
        const elements = (content.match(/<(rect|circle|path|line|text|g|polygon|polyline|ellipse)/g) || []).length;
        catElements += elements;
      }
      const avg = (catElements / group.items.length).toFixed(0);
      console.log(`    ${group.name}: ${avg} elements/widget`);
    }
  });

  test('analyze port system for snap-to-connect compatibility', async ({ request }) => {
    const resp = await request.get('/api/resources/widgets');
    const body = await resp.json();

    let withPorts = 0;
    let withoutPorts = 0;
    const portTypes = {};

    for (const group of body.groups) {
      for (const item of group.items) {
        const fileResp = await request.get('/' + item.path);
        const content = await fileResp.text();

        if (content.includes('data-port-id')) {
          withPorts++;
          const portTypeMatches = content.match(/data-port-type="(\w+)"/g) || [];
          for (const pt of portTypeMatches) {
            const type = pt.match(/data-port-type="(\w+)"/)[1];
            portTypes[type] = (portTypes[type] || 0) + 1;
          }
        } else {
          withoutPorts++;
        }
      }
    }

    console.log('\n=== PORT SYSTEM ANALYSIS (for snap-to-connect) ===');
    console.log(`  Widgets with ports: ${withPorts}`);
    console.log(`  Widgets without ports: ${withoutPorts}`);
    console.log(`  Port types found:`);
    for (const [type, count] of Object.entries(portTypes)) {
      console.log(`    ${type}: ${count} ports`);
    }

    console.log(`\n  vs SCADA STANDARDS:`);
    console.log(`    Standard SCADA connection points: input, output, signal, power`);
    console.log(`    FUXA port types: ${Object.keys(portTypes).join(', ')}`);
    console.log(`    Coverage: ${((withPorts / (withPorts + withoutPorts)) * 100).toFixed(0)}% of widgets have connection ports`);
  });
});
