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

import { fakeAsync, tick } from '@angular/core/testing';
import { BpmnViewerService, BpmnViewerAdapter } from './bpmn-viewer.service';

// Synthetic diagram shared in shape with the real-renderer browser acceptance cases.
const xml = `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://onap.org/tests">
<bpmn:process id="Process_1" isExecutable="true"><bpmn:callActivity id="Task_1" name="Deploy" calledElement="Child"/></bpmn:process>
<bpmndi:BPMNDiagram id="Diagram_1"><bpmndi:BPMNPlane id="Plane_1" bpmnElement="Process_1"><bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="100" y="100" width="100" height="80"/></bpmndi:BPMNShape></bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>`;

describe('BPMN viewer adapter', () => {
  let hosts: HTMLElement[], adapters: BpmnViewerAdapter[];
  beforeEach(() => { hosts = []; adapters = []; });
  afterEach(() => {
    adapters.forEach(adapter => adapter.destroy());
    hosts.forEach(host => host.parentNode.removeChild(host));
  });
  function create() {
    const host = document.createElement('div');
    host.style.width = '600px'; host.style.height = '400px';
    document.body.appendChild(host); hosts.push(host);
    const adapter = new BpmnViewerService().create(host);
    adapters.push(adapter);
    return adapter;
  }
  it('isolates canvases and releases overlay handlers when destroyed twice', done => {
    const first = create(), second = create();
    first.importXML(xml, error => {
      expect(error).toBeFalsy();
      second.importXML(xml, secondError => {
        expect(secondError).toBeFalsy();
        let navigated = '';
        first.addDrilldown('Task_1', 'child-1', id => navigated = id);
        const overlay = hosts[0].querySelector('.highlight-overlay') as HTMLElement;
        overlay.click();
        expect(navigated).toBe('child-1');
        navigated = '';
        first.destroy(); first.destroy();
        overlay.click();
        expect(navigated).toBe('');
        expect(hosts[0].querySelector('.djs-container')).toBeNull();
        expect(hosts[1].querySelector('[data-element-id="Task_1"]')).not.toBeNull();
        second.get('canvas').addMarker('Task_1', 'highlight');
        second.get('canvas').resized();
        second.get('canvas').zoom('fit-viewport', 'auto');
        second.get('zoomScroll').zoom(1, { x: 300, y: 200 });
        expect(hosts[1].querySelector('.highlight')).not.toBeNull();
        done();
      });
    });
  });
  it('creates a focusable named native drilldown button', done => {
    const adapter = create();
    adapter.importXML(xml, error => {
      expect(error).toBeFalsy();
      adapter.addDrilldown('Task_1', 'child-1', () => {});
      const overlay = hosts[0].querySelector('.highlight-overlay') as HTMLElement;
      expect(overlay.tagName).toBe('BUTTON');
      expect(overlay.getAttribute('type')).toBe('button');
      expect(overlay.getAttribute('aria-label')).toContain('Task_1');
      expect(overlay.getAttribute('aria-label')).toContain('child-1');
      overlay.focus();
      expect(document.activeElement).toBe(overlay);
      done();
    });
  });
  it('skips missing elements and empty called-process IDs', done => {
    const adapter = create();
    adapter.importXML(xml, error => {
      expect(error).toBeFalsy();
      const navigate = () => fail('empty drilldown must not navigate');
      adapter.addDrilldown('missing', 'child', navigate);
      adapter.addDrilldown('Task_1', null, navigate);
      adapter.addDrilldown('Task_1', '', navigate);
      adapter.addDrilldown('Task_1', '   ', navigate);
      expect(hosts[0].querySelector('.highlight-overlay')).toBeNull();
      done();
    });
  });
  it('leaves no canvas callback after destruction during zoom', fakeAsync(() => {
    const adapter = create();
    adapter.importXML(xml, error => {
      expect(error).toBeFalsy();
      adapter.get('canvas').zoom('fit-viewport', 'auto');
      adapter.get('zoomScroll').zoom(1, { x: 300, y: 200 });
    });
    tick();
    adapter.destroy();
    tick(500);
    expect(hosts[0].querySelector('.djs-container')).toBeNull();
  }));
  it('returns malformed XML errors through the installed callback API', done => {
    const adapter = create();
    adapter.importXML('<invalid>', error => {
      expect(error).toBeTruthy();
      done();
    });
  });
});
