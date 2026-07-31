import { Injectable, NgZone } from '@angular/core';
import { ConnectionService } from './connection.service';
import { View, GaugeSettings, ConnectionPort, ViewConnection, LiquidType } from '../_models/hmi';
import { ProjectService } from './project.service';

const SNAP_HALO_CLASS = 'snap-halo';
const SNAP_CONNECTED_CLASS = 'snap-connected';

@Injectable({ providedIn: 'root' })
export class ConnectionEditorService {

    private canvasEl: SVGElement | null = null;
    private snapIndicator: SVGCircleElement | null = null;
    private activeSnap: { elementId: string; port: ConnectionPort } | null = null;
    private draggingElementId: string | null = null;
    private onElementConnect?: (fromId: string, fromPort: string, toId: string, toPort: string) => void;

    constructor(
        private connectionService: ConnectionService,
        private projectService: ProjectService,
        private zone: NgZone
    ) {}

    init(canvas: SVGElement, onConnect?: (fromId: string, fromPort: string, toId: string, toPort: string) => void) {
        this.canvasEl = canvas;
        this.onElementConnect = onConnect;
        this.createSnapIndicator();
        this.bindEvents();
    }

    destroy() {
        this.removeSnapIndicator();
        this.canvasEl = null;
        this.activeSnap = null;
    }

    getPorts() {
        if (!this.canvasEl) return [];
        return this.connectionService.getPortsFromSvg(this.canvasEl);
    }

    checkConnectionOnDrop(elementId: string, mouseX: number, mouseY: number): boolean {
        const ports = this.getPorts();
        const snap = this.connectionService.findSnapTarget(mouseX, mouseY, ports, elementId);
        if (snap) {
            const fromPort = ports.find(p => p.elementId === elementId)?.port;
            if (fromPort && this.onElementConnect) {
                this.onElementConnect(elementId, fromPort.id, snap.targetElementId, snap.targetPort.id);
            }
            this.hideSnapIndicator();
            this.activeSnap = null;
            return true;
        }
        return false;
    }

    autoConnectOnAdd(addedElementId: string): void {
        if (!this.canvasEl) return;
        const ports = this.getPorts();
        const addedPorts = ports.filter(p => p.elementId === addedElementId);
        for (const ap of addedPorts) {
            const snap = this.connectionService.findSnapTarget(
                ap.absX, ap.absY, ports, addedElementId
            );
            if (snap && this.onElementConnect) {
                this.onElementConnect(addedElementId, ap.port.id, snap.targetElementId, snap.targetPort.id);
            }
        }
    }

    highlightPorts(elementId: string): void {
        if (!this.canvasEl) return;
        const portEls = this.canvasEl.querySelectorAll('[data-port-id]');
        portEls.forEach(el => {
            const owner = el.closest('[id]');
            if (owner?.getAttribute('id') === elementId) {
                el.setAttribute('r', '6');
                el.setAttribute('fill', '#22c55e');
                el.setAttribute('stroke', '#16a34a');
                el.setAttribute('stroke-width', '2');
                el.setAttribute('opacity', '0.8');
            }
        });
    }

    hidePortHighlights(): void {
        if (!this.canvasEl) return;
        const portEls = this.canvasEl.querySelectorAll('[data-port-id]');
        portEls.forEach(el => {
            el.setAttribute('r', '0');
            el.setAttribute('opacity', '0');
        });
    }

    private createSnapIndicator() {
        if (this.snapIndicator) return;
        const ns = 'http://www.w3.org/2000/svg';
        const circle = document.createElementNS(ns, 'circle');
        circle.setAttribute('class', SNAP_HALO_CLASS);
        circle.setAttribute('r', '12');
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', '#22c55e');
        circle.setAttribute('stroke-width', '3');
        circle.setAttribute('opacity', '0');
        circle.setAttribute('stroke-dasharray', '4 4');
        circle.setAttribute('pointer-events', 'none');
        this.snapIndicator = circle;
    }

    private showSnapIndicator(x: number, y: number) {
        if (!this.snapIndicator || !this.canvasEl) return;
        this.snapIndicator.setAttribute('cx', String(x));
        this.snapIndicator.setAttribute('cy', String(y));
        this.snapIndicator.setAttribute('opacity', '0.9');
        if (!this.snapIndicator.parentNode) {
            this.canvasEl.appendChild(this.snapIndicator);
        }
    }

    private hideSnapIndicator() {
        if (this.snapIndicator) {
            this.snapIndicator.setAttribute('opacity', '0');
        }
    }

    private removeSnapIndicator() {
        if (this.snapIndicator?.parentNode) {
            this.snapIndicator.parentNode.removeChild(this.snapIndicator);
        }
        this.snapIndicator = null;
    }

    private bindEvents() {
        if (!this.canvasEl) return;
        this.canvasEl.addEventListener('mousemove', (e: MouseEvent) => {
            this.zone.runOutsideAngular(() => {
                if (!this.canvasEl) return;
                const rect = this.canvasEl.getBoundingClientRect();
                const mx = e.clientX - rect.left + this.canvasEl.scrollLeft;
                const my = e.clientY - rect.top + this.canvasEl.scrollTop;
                const ports = this.connectionService.getPortsFromSvg(this.canvasEl);
                const snap = this.connectionService.findSnapTarget(mx, my, ports, this.draggingElementId || undefined);
                if (snap) {
                    this.activeSnap = { elementId: snap.targetElementId, port: snap.targetPort };
                    const targetPort = ports.find(p => p.elementId === snap.targetElementId && p.port.id === snap.targetPort.id);
                    if (targetPort) {
                        this.showSnapIndicator(targetPort.absX, targetPort.absY);
                    }
                } else {
                    this.hideSnapIndicator();
                    this.activeSnap = null;
                }
            });
        });
    }
}
