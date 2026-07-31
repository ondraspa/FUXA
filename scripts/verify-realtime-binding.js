const http = require('http');

const BASE_URL = process.argv[2] || 'http://localhost:1881';
const TEST_TAG_PREFIX = 'STG_';

function apiRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port || 1881,
            path: url.pathname,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch(e) { resolve(data); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function createTestProject() {
    console.log('\n=== Creating Staging Test Project ===\n');
    
    // Create a test project with galvanoplastics widgets
    const project = {
        name: 'Staging-Galvanoplastics-Test',
        views: [{
            id: 'view_staging_test',
            name: 'Galvanoplastics Dashboard',
            profile: { width: 1200, height: 800, bkcolor: '#1e293b' },
            items: {
                // Wastewater treatment widget
                'svg_ww': {
                    id: 'svg_ww',
                    type: 'svg-ext-gauges',
                    property: {
                        svgPath: '_widgets/galvanoplastics/wastewater-treatment.svg',
                        options: {}
                    }
                },
                // Deionization column
                'svg_di': {
                    id: 'svg_di',
                    type: 'svg-ext-gauges',
                    property: {
                        svgPath: '_widgets/galvanoplastics/deionization-column.svg',
                        options: {}
                    }
                },
                // RO/Softener
                'svg_ro': {
                    id: 'svg_ro',
                    type: 'svg-ext-gauges',
                    property: {
                        svgPath: '_widgets/galvanoplastics/ro-softener.svg',
                        options: {}
                    }
                },
                // Wash station
                'svg_wash': {
                    id: 'svg_wash',
                    type: 'svg-ext-gauges',
                    property: {
                        svgPath: '_widgets/galvanoplastics/wash-station.svg',
                        options: {}
                    }
                },
                // Laminar flow booth
                'svg_laminar': {
                    id: 'svg_laminar',
                    type: 'svg-ext-gauges',
                    property: {
                        svgPath: '_widgets/galvanoplastics/laminar-flow-booth.svg',
                        options: {}
                    }
                },
                // Drying booth
                'svg_drying': {
                    id: 'svg_drying',
                    type: 'svg-ext-gauges',
                    property: {
                        svgPath: '_widgets/galvanoplastics/drying-booth.svg',
                        options: {}
                    }
                },
                // Chemicals cabinet
                'svg_chem': {
                    id: 'svg_chem',
                    type: 'svg-ext-gauges',
                    property: {
                        svgPath: '_widgets/galvanoplastics/chemicals-cabinet.svg',
                        options: {}
                    }
                },
                // Sulfamate tank
                'svg_sulf': {
                    id: 'svg_sulf',
                    type: 'svg-ext-gauges',
                    property: {
                        svgPath: '_widgets/galvanoplastics/sulfamate-tank.svg',
                        options: {}
                    }
                }
            },
            connections: []
        }]
    };

    // Create devices with tags for each widget
    const devices = [
        {
            name: 'Wastewater-Controller',
            type: 'MockDevice',
            tags: {
                'STG_WW_ResinLevel': { type: 'number', value: 70, unit: '%' },
                'STG_WW_Active': { type: 'boolean', value: true }
            }
        },
        {
            name: 'Deionization-Controller',
            type: 'MockDevice',
            tags: {
                'STG_DI_FlowRate': { type: 'number', value: 50, unit: 'L/min' },
                'STG_DI_Running': { type: 'boolean', value: true }
            }
        },
        {
            name: 'WaterTreatment-Controller',
            type: 'MockDevice',
            tags: {
                'STG_RO_SoftLevel': { type: 'number', value: 80, unit: '%' },
                'STG_RO_BrineLevel': { type: 'number', value: 60, unit: '%' },
                'STG_RO_Active': { type: 'boolean', value: true }
            }
        },
        {
            name: 'WashStation-Controller',
            type: 'MockDevice',
            tags: {
                'STG_Wash_WaterLevel': { type: 'number', value: 40, unit: '%' },
                'STG_Wash_Active': { type: 'boolean', value: false }
            }
        },
        {
            name: 'LaminarFlow-Controller',
            type: 'MockDevice',
            tags: {
                'STG_Laminar_Fan': { type: 'boolean', value: true }
            }
        },
        {
            name: 'DryingBooth-Controller',
            type: 'MockDevice',
            tags: {
                'STG_Drying_Temp': { type: 'number', value: 60, unit: '°C' },
                'STG_Drying_Heating': { type: 'boolean', value: true }
            }
        },
        {
            name: 'Chemicals-Controller',
            type: 'MockDevice',
            tags: {
                'STG_Chem_BottleLevels': { type: 'array', value: [80, 60, 40, 90] },
                'STG_Chem_Secured': { type: 'boolean', value: true }
            }
        },
        {
            name: 'Sulfamate-Controller',
            type: 'MockDevice',
            tags: {
                'STG_Sulf_Level': { type: 'number', value: 75, unit: '%' },
                'STG_Sulf_OK': { type: 'boolean', value: true }
            }
        }
    ];

    console.log('Project structure created with 8 widgets and 8 mock devices');
    console.log('Tags per widget:');
    for (const dev of devices) {
        console.log(`  ${dev.name}:`);
        for (const [tagName, tag] of Object.entries(dev.tags)) {
            console.log(`    ${tagName} = ${tag.value} (${tag.unit || 'boolean'})`);
        }
    }

    return { project, devices };
}

async function verifyWidgetAccessibility() {
    console.log('\n=== Verifying Widget SVG Accessibility ===\n');
    
    const widgets = [
        'wastewater-treatment',
        'deionization-column',
        'ro-softener',
        'wash-station',
        'laminar-flow-booth',
        'drying-booth',
        'chemicals-cabinet',
        'sulfamate-tank'
    ];

    let allAccessible = true;
    for (const widget of widgets) {
        const resp = await apiRequest('/api/resources/widgets');
        const widgetUrl = `_widgets/galvanoplastics/${widget}.svg`;
        
        // Check if widget is in the API response
        let found = false;
        for (const group of resp.groups) {
            if (group.name === 'galvanoplastics') {
                found = group.items.some(item => item.name.includes(widget));
                break;
            }
        }
        
        if (found) {
            console.log(`  ✓ ${widget}.svg - accessible via API`);
        } else {
            console.log(`  ✗ ${widget}.svg - NOT found in API`);
            allAccessible = false;
        }
    }
    
    return allAccessible;
}

async function simulateRealTimeData() {
    console.log('\n=== Simulating Real-Time Data Updates ===\n');
    
    const updates = [
        { tag: 'STG_WW_ResinLevel', value: 85, widget: 'wastewater-treatment', variable: '_pn_resin' },
        { tag: 'STG_DI_FlowRate', value: 75, widget: 'deionization-column', variable: '_pn_flow' },
        { tag: 'STG_RO_SoftLevel', value: 90, widget: 'ro-softener', variable: '_pn_soft' },
        { tag: 'STG_Wash_WaterLevel', value: 60, widget: 'wash-station', variable: '_pn_water' },
        { tag: 'STG_Drying_Temp', value: 80, widget: 'drying-booth', variable: '_pn_temp' },
        { tag: 'STG_Sulf_Level', value: 65, widget: 'sulfamate-tank', variable: '_pn_level' }
    ];

    console.log('Simulated tag updates (these would come from PLC/SCADA):');
    for (const update of updates) {
        console.log(`  ${update.tag} → ${update.value} ${update.widget}/${update.variable}`);
    }

    console.log('\nExpected widget response:');
    console.log('  - Level widgets update fill height/position');
    console.log('  - Boolean widgets toggle alarm LED (green/red)');
    console.log('  - Animation direction follows flowDirection from connections');
    console.log('  - Liquid type propagates across connected widgets');
    
    return true;
}

async function main() {
    try {
        const { project, devices } = await createTestProject();
        const accessible = await verifyWidgetAccessibility();
        await simulateRealTimeData();
        
        console.log('\n=== Summary ===');
        console.log(`Widgets accessible: ${accessible ? 'YES' : 'NO'}`);
        console.log(`Test project: Staging-Galvanoplastics-Test`);
        console.log(`Mock devices: ${devices.length}`);
        console.log(`Total tags: ${devices.reduce((sum, d) => sum + Object.keys(d.tags).length, 0)}`);
        console.log('\nTo deploy staging:');
        console.log('  bash scripts/deploy-staging.sh');
        console.log('  cd staging/server && node main.js -p 1882');
        console.log('\nTo verify in browser:');
        console.log('  http://localhost:1882/editor/');
        
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

main();
