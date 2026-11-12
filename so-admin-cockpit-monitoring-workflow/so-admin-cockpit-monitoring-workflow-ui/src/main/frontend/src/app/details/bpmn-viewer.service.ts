/**
============LICENSE_START=======================================================
 Copyright (C) 2018 Ericsson. All rights reserved.
================================================================================
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
 limitations under the License.

SPDX-License-Identifier: Apache-2.0
============LICENSE_END=========================================================

@authors: ronan.kenny@est.tech, waqas.ikram@est.tech
*/

import { Injectable } from '@angular/core';
// Angular 6's build optimizer breaks inheritance in the unbundled package.
import * as Viewer from 'bpmn-js/dist/bpmn-navigated-viewer.production.min.js';

export interface BpmnElement { id: string; width: number; height: number; }
export interface BpmnCanvas {
  zoom(scale: string, center: string): void;
  addMarker(id: string, marker: string): void;
  resized(): void;
}
export interface BpmnRegistry { get(id: string): BpmnElement | undefined; }
export interface BpmnOverlays {
  add(id: string, configuration: { position: { top: number; left: number }; html: HTMLElement }): void;
}
export interface BpmnZoomScroll { zoom(step: number, center: { x: number; y: number }): void; }
interface ViewerHandle {
  importXML(xml: string, done: (error: Error | null | undefined) => void): void;
  get(name: 'canvas'): BpmnCanvas;
  get(name: 'elementRegistry'): BpmnRegistry;
  get(name: 'overlays'): BpmnOverlays;
  get(name: 'zoomScroll'): BpmnZoomScroll;
  destroy(): void;
}
export interface BpmnViewerAdapter extends ViewerHandle {
  addDrilldown(activityId: string, processId: string | null, navigate: (id: string) => void, activityName?: string): void;
}

class ManagedViewer implements BpmnViewerAdapter {
  private disposed = false;
  private handlers: { node: HTMLElement; click: EventListener }[] = [];
  constructor(private viewer: ViewerHandle) {}
  importXML(xml: string, done: (error: Error | null | undefined) => void) { this.viewer.importXML(xml, done); }
  get(name: 'canvas'): BpmnCanvas;
  get(name: 'elementRegistry'): BpmnRegistry;
  get(name: 'overlays'): BpmnOverlays;
  get(name: 'zoomScroll'): BpmnZoomScroll;
  get(name: string): BpmnCanvas | BpmnRegistry | BpmnOverlays | BpmnZoomScroll {
    switch (name) {
      case 'canvas': return this.viewer.get('canvas');
      case 'elementRegistry': return this.viewer.get('elementRegistry');
      case 'overlays': return this.viewer.get('overlays');
      case 'zoomScroll': return this.viewer.get('zoomScroll');
      default: throw new Error('Unsupported viewer service: ' + name);
    }
  }
  addDrilldown(activityId: string, processId: string | null, navigate: (id: string) => void, activityName?: string) {
    const element = this.get('elementRegistry').get(activityId);
    if (!element || !processId || !processId.trim()) { return; }
    const node = document.createElement('button');
    node.className = 'highlight-overlay';
    node.type = 'button';
    const label = 'Open process ' + processId + ' for ' + (activityName || activityId);
    node.setAttribute('aria-label', label);
    node.title = label;
    node.style.width = element.width + 'px';
    node.style.height = element.height + 'px';
    node.style.cursor = 'pointer';
    const click: EventListener = () => navigate(processId);
    node.addEventListener('click', click);
    this.handlers.push({ node, click });
    this.get('overlays').add(activityId, { position: { top: -5, left: -5 }, html: node });
  }
  destroy() {
    if (this.disposed) { return; }
    this.disposed = true;
    this.handlers.forEach(handler => handler.node.removeEventListener('click', handler.click));
    this.handlers = [];
    this.viewer.destroy();
  }
}

@Injectable({ providedIn: 'root' })
export class BpmnViewerService {
  create(container: HTMLElement): BpmnViewerAdapter {
    // The declaration covers only the installed viewer surface used by this adapter.
    // diagram-js 2 leaves its deferred viewbox timer alive after destroy().
    // Synchronous viewbox updates prevent callbacks from touching a disposed canvas.
    const viewer: ViewerHandle = new Viewer({ container, canvas: { deferUpdate: false } });
    return new ManagedViewer(viewer);
  }
}
