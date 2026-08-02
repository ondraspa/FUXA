/**
 * flex-repeater-svg.ts
 *
 * SVG template handling for the Flex Repeater.
 *
 * Responsibilities:
 *   - parse a widget SVG string into the target document (namespace-safe),
 *   - deep-clone the template per instance with namespaced element ids
 *     (e.g. `pump-0-status-led`) so cloned instances never collide,
 *   - extract the widget <script> body (processed later into a FUXA module),
 *   - wrap a clone's content in a positioned <g transform="translate(x y)">,
 *   - measure the template's base size for row/grid layout.
 *
 * Pure logic: no Angular / FUXA dependency. The DOM is injected so it can be a
 * real browser document or a headless one (xmldom) in tests.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface SvgBuildResult {
  /** The cloned template content (children moved into a wrapper <g> later). */
  root: SVGSVGElement;
  /** Template element id -> namespaced id. */
  idMap: ReadonlyMap<string, string>;
  /** Namespaced id -> element. */
  elementById: ReadonlyMap<string, SVGElement>;
  /** The first <script> body found in the template, if any. */
  widgetScript: string | null;
}

export interface SvgServiceOptions {
  document: Document;
  domParser?: DOMParser;
}

function globalDocument(): Document {
  if (typeof document === 'undefined') {
    throw new Error('[flex-repeater] No document available. Inject SVG_DOCUMENT.');
  }
  return document;
}

export class FlexRepeaterSvgService {
  private readonly document: Document;
  private readonly domParser: DOMParser;

  constructor(options: SvgServiceOptions = { document: globalDocument() }) {
    this.document = options.document;
    this.domParser = options.domParser ?? new DOMParser();
  }

  /** Parse a widget SVG string and import it into the target document. */
  parseTemplate(svgText: string): SVGSVGElement {
    const parsed = this.domParser.parseFromString(svgText, 'image/svg+xml');
    const root = parsed.documentElement;
    if (!root || root.nodeName.toLowerCase() !== 'svg') {
      throw new Error('[flex-repeater] Child template is not an <svg> document.');
    }
    return this.document.importNode(root, true) as unknown as SVGSVGElement;
  }

  /** Base size of the template, from width/height attrs, else viewBox, else default. */
  templateSize(template: SVGSVGElement): { width: number; height: number } {
    const widthAttr = parseFloat(template.getAttribute('width') ?? '');
    const heightAttr = parseFloat(template.getAttribute('height') ?? '');
    if (!Number.isNaN(widthAttr) && !Number.isNaN(heightAttr)) {
      return { width: widthAttr, height: heightAttr };
    }
    const viewBox = (template.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/);
    if (viewBox.length === 4) {
      return { width: parseFloat(viewBox[2]), height: parseFloat(viewBox[3]) };
    }
    return { width: 100, height: 100 };
  }

  /**
   * Clone the template for one instance: namespaces every id as
   * `${prefix}-${index}-${originalId}` and extracts the widget script.
   */
  buildInstance(
    template: SVGSVGElement,
    prefix: string,
    index: number,
  ): SvgBuildResult {
    const clone = template.cloneNode(true) as SVGSVGElement;
    const namespace = `${sanitizePrefix(prefix)}-${index}`;
    const idMap = new Map<string, string>();
    const elementById = new Map<string, SVGElement>();
    let widgetScript: string | null = null;

    const walk = (node: Node): void => {
      if (node.nodeType === 1) {
        const el = node as SVGElement;
        const name = el.nodeName.toLowerCase();
        if (name === 'script') {
          if (widgetScript === null) {
            widgetScript = (el.textContent ?? '').trim() || null;
          }
          el.parentNode?.removeChild(el);
          return;
        }
        const id = el.getAttribute('id');
        if (id) {
          const mapped = `${namespace}-${id}`;
          el.setAttribute('id', mapped);
          idMap.set(id, mapped);
          elementById.set(mapped, el);
        }
      }
      const children = Array.from(node.childNodes ?? []);
      for (const child of children) {
        walk(child);
      }
    };
    walk(clone);

    return { root: clone, idMap, elementById, widgetScript };
  }

  /** Wrap the clone's inner content in a positioned <g transform="translate(x y)">. */
  wrap(clone: SVGSVGElement, x: number, y: number): SVGGElement {
    const g = this.document.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform', `translate(${x} ${y})`);
    while (clone.firstChild) {
      g.appendChild(clone.firstChild);
    }
    return g;
  }

  /** Create an SVG-namespaced element. */
  createSvgElement(tag: string): SVGElement {
    return this.document.createElementNS(SVG_NS, tag);
  }
}

function sanitizePrefix(prefix: string): string {
  const cleaned = prefix.replace(/[^A-Za-z0-9_-]/g, '-');
  return cleaned || 'flex-repeater';
}
