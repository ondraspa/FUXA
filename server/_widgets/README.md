# FUXA SCADA Widget Library

## Standards Compliance

All widgets in this library follow **ISA-5.1-2022** instrumentation symbols and **ISA-101-2015** high-performance HMI guidelines:

- **ISA-5.1**: Standardized P&ID tag naming (PIT, FIC, LSH, etc.), line type conventions, and instrument bubble symbols
- **ISA-101**: Gray-scale base HMIs with exception-based color usage (no bright colors for normal states)

## Widget Database

`widgets-database.json` is the master registry. Every SVG widget is documented there with:
- ISA-5.1 tag and meaning
- Variable names, units, and ranges
- Connection port definitions
- Animation behaviors
- ISA-101 color palette

## Categories

| Category | Description | Widgets |
|----------|-------------|---------|
| `atex` | ATEX/IECEx certified explosion-proof instruments | 12 |
| `classic` | Classic industrial process components | 8 |
| `hvac` | Heating, ventilation, air conditioning equipment | 6 |
| `instruments` | ISA-5.1 process measurement instruments | 6 |
| `piping` | Piping components with ISA line types | 6 |
| `pressing` | Stamping press line machinery | 4 |
| `pressing-plant` | Complete press plant systems | 4 |
| `galvanoplastics` | Electroforming/electroplating production equipment | 8 |

## Widget SVG Specification

Each SVG widget must include:

1. **`data-port-id`** elements for snap-to-connect system
2. **`<script>` block** with `//!export-start`/`//!export-end` variables
3. **`postValue` / `putValue`** for FUXA data binding
4. **`MutationObserver`** for cleanup when removed from DOM
5. **CSS `@keyframes`** for flow/status animations
6. **Element IDs** for FUXA variable binding at runtime

## How to Use

1. Open FUXA editor at `/editor/`
2. Expand **Widgets** panel in the left sidebar
3. Browse categories and click a widget to select it
4. Click on the canvas to place the widget
5. Connect pipes between widgets (ports snap automatically)
6. Bind variables to widget properties via the property dialog

## How to Contribute

1. Fork the Project
2. Enter `server/_widgets/<category>/`
3. Add your SVG file following the widget specification above
4. Register it in `widgets-database.json`
5. Create a Pull Request

Each widget SVG must include a FUXA integration script block with proper variable exports.

## Resources

- https://github.com/frangoteam/FUXA/wiki/HowTo-Widgets
- ISA-5.1-2022: Instrumentation Symbols and Identification
- ISA-101-2015: Human Machine Interfaces for Process Automation Systems
