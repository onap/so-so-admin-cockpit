/**
============LICENSE_START=======================================================
 Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
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

*/

import { BpmnViewerAdapter, BpmnCanvas, BpmnRegistry, BpmnOverlays, BpmnZoomScroll } from '../details/bpmn-viewer.service';

export class BpmnViewerStub implements BpmnViewerAdapter {
  addDrilldown = jasmine.createSpy('drilldown').and.callFake((
    id: string, processId: string | null, navigate: (processId: string) => void
  ) => {
    this.overlay = document.createElement('div');
    this.overlay.onclick = () => { if (processId) { navigate(processId); } };
    this.overlays.add(id, { position: { top: -5, left: -5 }, html: this.overlay });
  });
  importError?: Error | null;
  overlay: HTMLElement = document.createElement('div');
  canvas = {
    zoom: jasmine.createSpy('zoom'),
    addMarker: jasmine.createSpy('marker'),
    resized: jasmine.createSpy('resized')
  };
  registry = {
    get: jasmine
      .createSpy('get')
      .and.callFake((id: string) =>
        id === 'missing' ? undefined : { id, width: 100, height: 80 }
      )
  };
  overlays = {
    add: jasmine
      .createSpy('add')
      .and.callFake((id: string, config: { html: HTMLElement }) => (this.overlay = config.html))
  };
  zoomScroll = { zoom: jasmine.createSpy('zoom') };
  importXML = jasmine
    .createSpy('importXML')
    .and.callFake((xml: string, done: (error: Error | null | undefined) => void) => done(this.importError));
  destroy = jasmine.createSpy('destroy');
  get(name: 'canvas'): BpmnCanvas;
  get(name: 'elementRegistry'): BpmnRegistry;
  get(name: 'overlays'): BpmnOverlays;
  get(name: 'zoomScroll'): BpmnZoomScroll;
  get(name: string): BpmnCanvas | BpmnRegistry | BpmnOverlays | BpmnZoomScroll {
    switch (name) {
      case 'canvas': return this.canvas;
      case 'elementRegistry': return this.registry;
      case 'overlays': return this.overlays;
      case 'zoomScroll': return this.zoomScroll;
      default: throw new Error('Unsupported viewer service: ' + name);
    }
  }
}
