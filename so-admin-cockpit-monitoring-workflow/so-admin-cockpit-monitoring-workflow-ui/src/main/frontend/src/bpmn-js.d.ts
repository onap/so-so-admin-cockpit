// Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Only the distributed viewer surface used by BpmnViewerService is declared.
declare module 'bpmn-js/dist/bpmn-navigated-viewer.production.min.js' {
  namespace Viewer {
    interface Options { container: HTMLElement; canvas: { deferUpdate: boolean }; }
  }
  class Viewer {
    constructor(options: Viewer.Options);
    importXML(xml: string, done: (error: Error | null | undefined) => void): void;
    get(name: 'canvas'): {
      zoom(scale: string, center: string): void;
      addMarker(id: string, marker: string): void;
      resized(): void;
    };
    get(name: 'elementRegistry'): { get(id: string): { id: string; width: number; height: number } | undefined };
    get(name: 'overlays'): {
      add(id: string, configuration: { position: { top: number; left: number }; html: HTMLElement }): void;
    };
    get(name: 'zoomScroll'): { zoom(step: number, center: { x: number; y: number }): void };
    destroy(): void;
  }
  export = Viewer;
}
