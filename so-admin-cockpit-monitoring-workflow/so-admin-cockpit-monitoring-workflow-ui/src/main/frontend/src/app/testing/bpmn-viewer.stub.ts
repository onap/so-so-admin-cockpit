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

export class BpmnViewerStub {
  importError: Error = null;
  overlay: HTMLElement;
  canvas = {
    zoom: jasmine.createSpy('zoom'),
    addMarker: jasmine.createSpy('marker'),
    resized: jasmine.createSpy('resized')
  };
  registry = {
    get: jasmine
      .createSpy('get')
      .and.callFake((id) =>
        id === 'missing' ? undefined : { id, width: 100, height: 80 }
      )
  };
  overlays = {
    add: jasmine
      .createSpy('add')
      .and.callFake((id, config) => (this.overlay = config.html))
  };
  zoomScroll = { zoom: jasmine.createSpy('zoom') };
  importXML = jasmine
    .createSpy('importXML')
    .and.callFake((xml, done) => done(this.importError));
  get(name: string) {
    return {
      canvas: this.canvas,
      elementRegistry: this.registry,
      overlays: this.overlays,
      zoomScroll: this.zoomScroll
    }[name];
  }
  destroy = jasmine.createSpy('destroy');
}
