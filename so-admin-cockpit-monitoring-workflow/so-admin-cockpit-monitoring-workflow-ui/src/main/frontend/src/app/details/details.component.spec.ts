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
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { BpmnViewerService } from './bpmn-viewer.service';
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
    viewers: any,
    allViewers: BpmnViewerStub[],
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
      of(Object.assign({}, process, { processInstanceId: id }))
    );
    api.getActivityInstance.and.callFake(() => of([activity]));
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
    allViewers = [];
    viewers = { create: jasmine.createSpy('create').and.callFake(() => {
      const next = allViewers.length === 0 ? viewer : new BpmnViewerStub();
      allViewers.push(next);
      return next;
    }) };
    params = new BehaviorSubject({ id: 'process-1' });
    TestBed.configureTestingModule({
      imports: componentImports,
      declarations: [DetailsComponent],
      providers: [
        { provide: DataService, useValue: api },
        { provide: BpmnViewerService, useValue: viewers },
        { provide: ToastrNotificationService, useValue: popup },
        { provide: NgxSpinnerService, useValue: spinner },
        { provide: ActivatedRoute, useValue: { params } }
      ]
    });
    fixture = TestBed.createComponent(DetailsComponent);
    component = fixture.componentInstance;
    router = TestBed.get(Router);
    spyOn(router, 'navigate');
  });
  function start() {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }
  it('renders process, activity and variable data and imports XML after activities resolve', fakeAsync(() => {
    const activities = new Subject<any[]>();
    api.getActivityInstance.and.returnValue(activities);
    fixture.detectChanges();
    tick();
    expect(viewer.importXML).not.toHaveBeenCalled();
    activities.next([activity]);
    activities.complete();
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
          throwError({ status: 500 })
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
      of([Object.assign({}, activity, { activityId: 'missing' })])
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
  it('keeps route B when process A responds later', fakeAsync(() => {
    const pending = new Subject<any>();
    api.getProcessInstance.and.callFake(id => id === 'process-1' ? pending :
      of(Object.assign({}, process, { processInstanceId: id })));
    fixture.detectChanges();
    tick();
    params.next({ id: 'process-2' });
    tick();
    pending.next(process);
    pending.complete();
    fixture.detectChanges();
    expect(component.processInstance.processInstanceId).toBe('process-2');
    expect(fixture.nativeElement.textContent).toContain('process-2');
  }));
  it('keeps B activities, definition and variables when A finishes later', fakeAsync(() => {
    const oldActivities = new Subject<any[]>(), oldDefinition = new Subject<any>(), oldVariables = new Subject<any[]>();
    api.getActivityInstance.and.returnValues(oldActivities, of([Object.assign({}, activity, { activityName: 'Current' })]));
    api.getProcessDefinition.and.returnValues(oldDefinition, of({ processDefinitionXml: '<current/>' }));
    api.getVariableInstance.and.returnValues(oldVariables, of([{ name: 'current', type: 'String', value: 'B' }]));
    start(); params.next({ id: 'process-2' }); tick();
    oldActivities.next([activity]); oldActivities.complete();
    oldDefinition.next({ processDefinitionXml: '<obsolete/>' }); oldDefinition.complete();
    oldVariables.next([{ name: 'obsolete', type: 'String', value: 'A' }]);
    expect(component.activityInstance[0].activityName).toBe('Current');
    expect(component.processDefinition.processDefinitionXml).toBe('<current/>');
    expect(component.variableInstance[0].name).toBe('current');
    expect(allViewers[1].importXML).toHaveBeenCalledWith('<current/>', jasmine.any(Function));
  }));
  it('cancels all pending route requests on destruction', fakeAsync(() => {
    const activities = new Subject<any[]>(), definition = new Subject<any>(), variables = new Subject<any[]>();
    api.getActivityInstance.and.returnValue(activities);
    api.getProcessDefinition.and.returnValue(definition);
    api.getVariableInstance.and.returnValue(variables);
    start();
    fixture.destroy();
    activities.next([activity]); activities.complete();
    definition.next({ processDefinitionXml: 'late' }); definition.complete();
    variables.next([{ name: 'late', type: 'String', value: 'late' }]);
    expect(component.activityInstance).toEqual([]);
    expect(component.variableInstance).toEqual([]);
    expect(viewer.importXML).not.toHaveBeenCalled();
    expect(viewer.destroy).toHaveBeenCalledTimes(1);
    expect(activities.observers.length + definition.observers.length + variables.observers.length).toBe(0);
  }));
  it('disposes A before creating B and ignores a late XML import callback', fakeAsync(() => {
    let finish: (error: Error) => void;
    viewer.importXML.and.callFake((xml, done) => finish = done);
    start();
    expect(spinner.hide).not.toHaveBeenCalled();
    let finishCurrent: (error: Error) => void;
    const current = new BpmnViewerStub();
    current.importXML.and.callFake((xml, done) => finishCurrent = done);
    viewers.create.and.callFake(() => { allViewers.push(current); return current; });
    params.next({ id: 'process-2' });
    tick();
    expect(viewer.destroy).toHaveBeenCalledTimes(1);
    expect(allViewers.length).toBe(2);
    expect(spinner.hide).not.toHaveBeenCalled();
    finish(null);
    expect(viewer.canvas.addMarker).not.toHaveBeenCalled();
    expect(current.canvas.addMarker).not.toHaveBeenCalled();
    expect(spinner.hide).not.toHaveBeenCalled();
    finishCurrent(null);
    expect(current.canvas.addMarker).toHaveBeenCalledWith('Task_1', 'highlight');
    expect(spinner.hide).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(viewer.destroy).toHaveBeenCalledTimes(1);
    expect(current.destroy).toHaveBeenCalledTimes(1);
  }));
  it('ignores duplicate import completion callbacks', fakeAsync(() => {
    let finish: (error: Error) => void;
    viewer.importXML.and.callFake((xml, done) => finish = done);
    start();
    finish(null); finish(null);
    expect(viewer.canvas.addMarker).toHaveBeenCalledTimes(1);
  }));
  it('does not navigate through an overlay retained from the previous route', fakeAsync(() => {
    start();
    const obsoleteOverlay = viewer.overlay;
    params.next({ id: 'process-2' }); tick();
    obsoleteOverlay.click();
    expect(router.navigate).not.toHaveBeenCalled();
  }));
  it('ignores a late import after navigation away', fakeAsync(() => {
    let finish: (error: Error) => void;
    viewer.importXML.and.callFake((xml, done) => finish = done);
    start();
    fixture.destroy();
    finish(null);
    expect(viewer.canvas.addMarker).not.toHaveBeenCalled();
    expect(spinner.hide).toHaveBeenCalled();
  }));
  it('recovers on a later route after an earlier load failed', fakeAsync(() => {
    api.getProcessInstance.and.returnValues(throwError({ status: 500 }), of(process));
    start();
    params.next({ id: 'process-2' });
    tick();
    expect(component.activityInstance).toEqual([activity]);
    expect(allViewers[1].canvas.addMarker).toHaveBeenCalledWith('Task_1', 'highlight');
    expect(popup.error.calls.count()).toBe(1);
  }));
  it('renders the diagram without markers when activity history fails', fakeAsync(() => {
    api.getActivityInstance.and.returnValue(throwError({ status: 500 }));
    start();
    expect(component.activityInstance).toEqual([]);
    expect(viewer.importXML).toHaveBeenCalled();
    expect(viewer.canvas.zoom).toHaveBeenCalledWith('fit-viewport', 'auto');
    expect(viewer.canvas.addMarker).not.toHaveBeenCalled();
    expect(popup.error.calls.count()).toBe(1);
  }));
  it('keeps the diagram available if only variables fail', fakeAsync(() => {
    api.getVariableInstance.and.returnValue(throwError({ status: 500 }));
    start();
    expect(component.activityInstance).toEqual([activity]);
    expect(viewer.canvas.addMarker).toHaveBeenCalledWith('Task_1', 'highlight');
    expect(viewer.destroy).not.toHaveBeenCalled();
    expect(component.variableInstance).toEqual([]);
  }));
  it('does not load again for duplicate route IDs', fakeAsync(() => {
    start(); params.next({ id: 'process-1' }); tick();
    expect(allViewers.length).toBe(1);
  }));
  [null, '', '   '].forEach(calledProcessInstanceId => {
    it('does not add a drilldown for an empty called process ID: ' + calledProcessInstanceId, fakeAsync(() => {
      api.getActivityInstance.and.returnValue(of([Object.assign({}, activity, { calledProcessInstanceId })]));
      start();
      expect(viewer.addDrilldown).not.toHaveBeenCalled();
      expect(viewer.canvas.addMarker).toHaveBeenCalled();
    }));
  });
  it('allows zoom buttons before loading and after destruction', () => {
    component.zoomIn(); component.zoomOut(); component.resetZoom();
    expect(viewer.zoomScroll.zoom).not.toHaveBeenCalled();
  });
  it('formats object variables without mutating the raw response', fakeAsync(() => {
    const rows = [
      { name: 'settings', type: 'Object', value: { enabled: true, zones: ['west', null, 2] } },
      { name: 'empty', type: 'Object', value: null },
      { name: 'count', type: 'Integer', value: 3 }
    ];
    api.getVariableInstance.and.returnValue(of(rows));
    start();
    expect(rows[0].value).toEqual({ enabled: true, zones: ['west', null, 2] });
    expect(Object.is(component.variableInstance[0], rows[0])).toBe(false);
    expect(component.variableInstance[0].value).toBe('{\n  "enabled": true,\n  "zones": [\n    "west",\n    null,\n    2\n  ]\n}');
    expect(component.variableInstance[1].value).toBeNull();
    expect(component.variableInstance[2].value).toBe(3);
  }));
});
