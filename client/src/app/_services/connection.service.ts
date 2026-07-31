import { Injectable } from '@angular/core';
import { View, GaugeSettings, ConnectionPort, ViewConnection, LiquidType } from '../_models/hmi';
import { Utils } from '../_helpers/utils';

const SNAP_DISTANCE = 20;

export interface SnapResult {
    targetElementId: string;
    targetPort: ConnectionPort;
    distance: number;
}

export const LIQUID_COLORS: Record<LiquidType, { pipe: string; content: string; border: string }> = {
    [LiquidType.water]: { pipe: '#3b82f6', content: '#93c5fd', border: '#1e40af' },
    [LiquidType.steam]: { pipe: '#e2e8f0', content: '#f8fafc', border: '#94a3b8' },
    [LiquidType.oil]: { pipe: '#d97706', content: '#fbbf24', border: '#92400e' },
    [LiquidType.gas]: { pipe: '#7dd3fc', content: '#bae6fd', border: '#0369a1' },
    [LiquidType.chemical]: { pipe: '#22c55e', content: '#86efac', border: '#14532d' },
    [LiquidType.air]: { pipe: '#cbd5e1', content: '#e2e8f0', border: '#64748b' },
};

@Injectable({ providedIn: 'root' })
export class ConnectionService {
    private static _instance: ConnectionService;
    static setInstance(service: ConnectionService): void {
        ConnectionService._instance = service;
    }
    static get instance(): ConnectionService {
        return ConnectionService._instance;
    }

    getPortsFromSvg(svgElement: SVGElement): { elementId: string; port: ConnectionPort; absX: number; absY: number }[] {
        const ports: { elementId: string; port: ConnectionPort; absX: number; absY: number }[] = [];
        const portEls = svgElement.querySelectorAll('[data-port-id]');
        portEls.forEach(el => {
            const portId = el.getAttribute('data-port-id') || '';
            const dir = (el.getAttribute('data-port-dir') || 'left') as ConnectionPort['direction'];
            const pType = (el.getAttribute('data-port-type') || 'pipe') as ConnectionPort['portType'];
            const cx = parseFloat(el.getAttribute('cx') || '0');
            const cy = parseFloat(el.getAttribute('cy') || '0');
            const abs = this.getAbsolutePosition(el as SVGElement);
            const owner = el.closest('[id^="svg_"]') || el.closest('g[id]');
            const elementId = owner?.getAttribute('id') || '';
            ports.push({
                elementId,
                port: { id: portId, x: cx, y: cy, direction: dir, portType: pType },
                absX: abs.x,
                absY: abs.y,
            });
        });
        return ports;
    }

    findSnapTarget(
        mouseX: number, mouseY: number,
        ports: { elementId: string; port: ConnectionPort; absX: number; absY: number }[],
        excludeElementId?: string
    ): SnapResult | null {
        let best: SnapResult | null = null;
        for (const p of ports) {
            if (p.elementId === excludeElementId) continue;
            const dx = mouseX - p.absX;
            const dy = mouseY - p.absY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < SNAP_DISTANCE && (!best || dist < best.distance)) {
                best = { targetElementId: p.elementId, targetPort: p.port, distance: dist };
            }
        }
        return best;
    }

    getLiquidColor(liquidType?: LiquidType) {
        return LIQUID_COLORS[liquidType || LiquidType.water];
    }

    propagateLiquidType(view: View, startElementId: string): void {
        const visited = new Set<string>();
        const queue = [startElementId];
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);
            const currentGs = view.items[currentId];
            if (!currentGs) continue;
            const connections = view.connections.filter(
                c => c.fromElementId === currentId || c.toElementId === currentId
            );
            for (const conn of connections) {
                if (conn.liquidType && currentGs && !currentGs.liquidType) {
                    currentGs.liquidType = conn.liquidType;
                }
                const neighborId = conn.fromElementId === currentId ? conn.toElementId : conn.fromElementId;
                const neighbor = view.items[neighborId];
                if (neighbor && !visited.has(neighborId)) {
                    if (!neighbor.liquidType && currentGs?.liquidType) {
                        neighbor.liquidType = currentGs.liquidType;
                    }
                    queue.push(neighborId);
                }
            }
        }
    }

    getFlowDirection(connections: { fromElementId: string; toElementId: string; flowDirection?: number }[], elementId: string): number {
        const conn = connections.find(
            c => c.fromElementId === elementId || c.toElementId === elementId
        );
        return conn?.flowDirection ?? 1;
    }

    updatePipeAnimationDirection(svgElement: SVGElement, flowDirection: number): void {
        const animEl = Utils?.searchTreeStartWith?.(svgElement, 'aPIE_');
        if (!animEl) return;
        let animRef: any = null;
        const statusRef = (svgElement as any).__gaugeStatus?.actionRef;
        if (statusRef?.animr) {
            animRef = statusRef.animr;
        }
        if (animRef) {
            if (flowDirection === 0) {
                animRef.stop();
            } else {
                animRef.setDirection(flowDirection === 1 ? 'forward' : 'reverse');
                if (!animRef.isRunning) {
                    animRef.start();
                }
            }
        }
    }

    private getAbsolutePosition(el: SVGElement): { x: number; y: number } {
        let x = 0, y = 0;
        let current: SVGElement | null = el;
        while (current) {
            const bbox = (current as SVGGraphicsElement).getBBox ? (current as SVGGraphicsElement).getBBox() : null;
            if (bbox) {
                const tx = current.getAttribute('transform');
                if (tx) {
                    const match = tx.match(/translate\(([-\d.]+),?\s*([-\d.]+)\)/);
                    if (match) {
                        x += parseFloat(match[1]);
                        y += parseFloat(match[2]);
                    }
                }
                x += bbox.x || 0;
                y += bbox.y || 0;
            }
            current = current.parentElement as unknown as SVGElement | null;
        }
        return { x, y };
    }
}
