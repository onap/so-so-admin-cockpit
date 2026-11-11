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

import {
  TestBed,
  ComponentFixture,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { DetailsComponent } from './details.component';
import { DataService } from '../data.service';
import { ToastrNotificationService } from '../toastr-notification-service.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import {
  componentImports,
  notificationStub,
  spinnerStub
} from '../testing/component-test';
import { BpmnViewerStub } from '../testing/bpmn-viewer.stub';
import { process, activity } from '../testing/api-fixtures';
describe('Process inspection', () => {
  let component: DetailsComponent,
    fixture: ComponentFixture<DetailsComponent>,
    api: any,
    popup: any,
    spinner: any,
    viewer: BpmnViewerStub,
    params: BehaviorSubject<any>,
    router: Router;
  beforeEach(() => {
    api = jasmine.createSpyObj('api', [
      'getProcessInstance',
      'getActivityInstance',
      'getProcessDefinition',
      'getVariableInstance'
    ]);
    api.getProcessInstance.and.callFake((id) =>
      Promise.resolve(Object.assign({}, process, { processInstanceId: id }))
    );
    api.getActivityInstance.and.callFake(() => Promise.resolve([activity]));
    api.getProcessDefinition.and.returnValue(
      of({ processDefinitionXml: '<definitions/>' })
    );
    api.getVariableInstance.and.returnValue(
      of([
        { name: 'region', type: 'String', value: 'west' },
        { name: 'settings', type: 'Object', value: { enabled: true } }
      ])
    );
    popup = notificationStub();
    spinner = spinnerStub();
    viewer = new BpmnViewerStub();
    params = new BehaviorSubject({ id: 'process-1' });
    TestBed.configureTestingModule({
      imports: componentImports,
      declarations: [DetailsComponent],
      providers: [
        { provide: DataService, useValue: api },
        { provide: ToastrNotificationService, useValue: popup },
        { provide: NgxSpinnerService, useValue: spinner },
        { provide: ActivatedRoute, useValue: { params } }
      ]
    });
    fixture = TestBed.createComponent(DetailsComponent);
    component = fixture.componentInstance;
    router = TestBed.get(Router);
    spyOn(router, 'navigate');
    spyOn(component as any, 'createViewer').and.returnValue(viewer);
  });
  function start() {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }
  it('renders process, activity and variable data and imports XML after activities resolve', fakeAsync(() => {
    let resolve: Function;
    api.getActivityInstance.and.returnValue(new Promise((r) => (resolve = r)));
    fixture.detectChanges();
    tick();
    expect(viewer.importXML).not.toHaveBeenCalled();
    resolve([activity]);
    tick();
    fixture.detectChanges();
    expect(viewer.importXML).toHaveBeenCalledWith(
      '<definitions/>',
      jasmine.any(Function)
    );
    expect(fixture.nativeElement.textContent).toContain('Provision service');
    expect(component.activityInstance[0].activityName).toBe('Deploy');
    expect(component.variableInstance[1].value).toBe('{\n  "enabled": true\n}');
    expect(viewer.canvas.addMarker).toHaveBeenCalledWith('Task_1', 'highlight');
  }));
  it('drills into a called subprocess through its overlay', fakeAsync(() => {
    start();
    viewer.overlay.click();
    expect(router.navigate).toHaveBeenCalledWith(['/details/child-1']);
  }));
  it('supports zoom and reset controls', fakeAsync(() => {
    start();
    component.zoomIn();
    component.zoomOut();
    component.resetZoom();
    expect(viewer.zoomScroll.zoom.calls.allArgs().map((a) => a[0])).toEqual([
      1, -1
    ]);
    expect(viewer.canvas.resized).toHaveBeenCalled();
  }));
  it('reloads details when the route ID changes', fakeAsync(() => {
    start();
    params.next({ id: 'process-2' });
    tick();
    fixture.detectChanges();
    expect(component.processInstance.processInstanceId).toBe('process-2');
    expect(api.getVariableInstance).toHaveBeenCalledWith('process-2');
  }));
  [
    'getProcessInstance',
    'getActivityInstance',
    'getProcessDefinition',
    'getVariableInstance'
  ].forEach((method) =>
    it(
      'reports ' + method + ' failure without leaving loading active',
      fakeAsync(() => {
        api[method].and.callFake(() =>
          method === 'getProcessInstance' || method === 'getActivityInstance'
            ? Promise.reject({ status: 500 })
            : throwError({ status: 500 })
        );
        start();
        expect(popup.error).toHaveBeenCalled();
        expect(spinner.hide).toHaveBeenCalled();
      })
    )
  );
  it('reports malformed XML and stops loading', fakeAsync(() => {
    viewer.importError = new Error('invalid XML');
    start();
    expect(popup.error).toHaveBeenCalledWith('Unable to load BPMN flow ');
    expect(spinner.hide).toHaveBeenCalled();
  }));
  it('ignores activities absent from the diagram', fakeAsync(() => {
    api.getActivityInstance.and.callFake(() =>
      Promise.resolve([Object.assign({}, activity, { activityId: 'missing' })])
    );
    start();
    expect(viewer.overlays.add).not.toHaveBeenCalled();
    expect(viewer.canvas.addMarker).not.toHaveBeenCalled();
  }));
  it('destroys the viewer and stops reacting to routes when destroyed', fakeAsync(() => {
    start();
    fixture.destroy();
    expect(viewer.destroy).toHaveBeenCalled();
    api.getProcessInstance.calls.reset();
    params.next({ id: 'later' });
    tick();
    expect(api.getProcessInstance).not.toHaveBeenCalled();
  }));
  it('ignores a slow response from the previous route', fakeAsync(() => {
    let resolve: Function;
    api.getProcessInstance.and.callFake((id) =>
      id === 'process-1'
        ? new Promise((r) => (resolve = r))
        : Promise.resolve(Object.assign({}, process, { processInstanceId: id }))
    );
    fixture.detectChanges();
    params.next({ id: 'process-2' });
    tick();
    resolve(process);
    tick();
    fixture.detectChanges();
    expect(component.processInstance.processInstanceId).toBe('process-2');
  }));
  it('does not import a diagram after destruction during a request', fakeAsync(() => {
    let resolve: Function;
    api.getProcessInstance.and.returnValue(new Promise((r) => (resolve = r)));
    fixture.detectChanges();
    fixture.destroy();
    resolve(process);
    tick();
    expect(viewer.importXML).not.toHaveBeenCalled();
  }));
});
