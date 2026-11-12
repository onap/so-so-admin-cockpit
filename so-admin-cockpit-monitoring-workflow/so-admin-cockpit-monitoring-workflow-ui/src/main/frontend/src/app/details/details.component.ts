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

import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { Subject, Observable, EMPTY, of, merge, forkJoin, asapScheduler } from 'rxjs';
import { map, distinctUntilChanged, observeOn, tap, switchMap, catchError, finalize, takeUntil } from 'rxjs/operators';
import { DataService } from '../data.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ActivityInstance } from '../model/activityInstance.model';
import { ProcessInstanceDetail } from '../model/processInstance.model';
import { ProcessDefinitionDetail } from '../model/processDefinition.model';
import { VariableInstanceDisplay } from '../model/variableInstance.model';
import { ToastrNotificationService } from '../toastr-notification-service.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { BpmnViewerService, BpmnViewerAdapter } from './bpmn-viewer.service';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DetailsComponent implements AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private activeLoad = 0;
  @ViewChild('canvas') elementReference: ElementRef;
  bpmnViewer: BpmnViewerAdapter | null = null;
  processInstanceID = '';
  processDefinitionID = '';
  processDefinitionName = '';
  activityInstance: ActivityInstance[] = [];
  processInstance: ProcessInstanceDetail | null = null;
  processDefinition: ProcessDefinitionDetail | null = null;
  variableInstance: VariableInstanceDisplay[] = [];
  displayedColumns = ['activityId', 'activityName', 'activityType', 'startTime', 'endTime', 'durationInMillis'];
  displayedColumnsVariable = ['name', 'type', 'value'];

  constructor(private route: ActivatedRoute, private data: DataService, private popup: ToastrNotificationService,
    private router: Router, private spinner: NgxSpinnerService, private viewers: BpmnViewerService) {}

  ngAfterViewInit() {
    this.route.params.pipe(
      map(params => params.id as string),
      distinctUntilChanged(),
      // A synchronous route emission must not change checked template bindings in AfterViewInit.
      observeOn(asapScheduler),
      tap(id => {
        ++this.activeLoad;
        this.disposeViewer();
        this.processInstanceID = id;
        this.processDefinitionID = this.processDefinitionName = '';
        this.processInstance = this.processDefinition = null;
        this.activityInstance = [];
        this.variableInstance = [];
        this.spinner.show();
      }),
      switchMap(id => {
        const load = this.activeLoad;
        this.bpmnViewer = this.viewers.create(this.elementReference.nativeElement);
        return merge(this.loadDiagram(id, load), this.loadVariables(id));
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private loadDiagram(id: string, load: number): Observable<void> {
    let failure = 'Unable to get process instance for id: ' + id;
    return this.data.getProcessInstance(id).pipe(
      tap(instance => {
        this.processInstance = instance;
        this.processDefinitionID = instance.processDefinitionId;
        this.processDefinitionName = instance.processDefinitionName;
      }),
      switchMap(instance => forkJoin<ActivityInstance[], ProcessDefinitionDetail>([
        this.data.getActivityInstance(id).pipe(catchError(error => {
          this.popup.error('Unable to get activity instance details for id: ' + id + ' Error code:' + error.status);
          return of([] as ActivityInstance[]);
        })),
        this.data.getProcessDefinition(instance.processDefinitionId).pipe(catchError(error => {
          failure = 'Unable to get process definition for id: ' + instance.processDefinitionId;
          throw error;
        }))
      ])),
      switchMap(result => {
        this.activityInstance = result[0];
        this.processDefinition = result[1];
        failure = 'Unable to load BPMN flow ';
        return this.importDiagram(result[1].processDefinitionXml, result[0], load);
      }),
      catchError(error => {
        this.popup.error(failure + (failure === 'Unable to load BPMN flow ' ? '' : ' Error code:' + error.status));
        this.disposeViewer();
        return EMPTY;
      }),
      finalize(() => { if (load === this.activeLoad) { this.spinner.hide(); } })
    );
  }

  private importDiagram(xml: string, activities: ActivityInstance[], load: number): Observable<void> {
    const viewer = this.bpmnViewer;
    return new Observable<void>(observer => {
      viewer.importXML(xml, error => {
        if (load !== this.activeLoad || observer.closed) { return; }
        if (error) { observer.error(error); return; }
        const registry = viewer.get('elementRegistry');
        activities.forEach(activity => {
          if (!registry.get(activity.activityId)) { return; }
          if (activity.calledProcessInstanceId && activity.calledProcessInstanceId.trim()) {
            viewer.addDrilldown(activity.activityId, activity.calledProcessInstanceId, id => {
              if (load === this.activeLoad) { this.router.navigate(['/details/' + id]); }
            });
          }
          viewer.get('canvas').addMarker(activity.activityId, 'highlight');
        });
        viewer.get('canvas').zoom('fit-viewport', 'auto');
        observer.next();
        observer.complete();
      });
    });
  }

  private loadVariables(id: string): Observable<VariableInstanceDisplay[]> {
    return this.data.getVariableInstance(id).pipe(
      map(rows => rows.map(variable => {
        const rawValue = variable.value;
        const value = typeof rawValue === 'object'
          ? (rawValue === null ? null : JSON.stringify(rawValue, null, 2)) : rawValue;
        return { name: variable.name, type: variable.type, value };
      })),
      tap(rows => this.variableInstance = rows),
      catchError(error => {
        this.popup.error('Unable to get Variable instances for id: ' + id + ' Error code:' + error.status);
        return EMPTY;
      })
    );
  }

  zoomIn() { this.zoom(1); }
  zoomOut() { this.zoom(-1); }
  private zoom(step: number) {
    if (!this.bpmnViewer) { return; }
    const element: HTMLElement = this.elementReference.nativeElement;
    this.bpmnViewer.get('zoomScroll').zoom(step, { x: element.offsetWidth / 2, y: element.offsetHeight / 2 });
  }
  resetZoom() {
    if (!this.bpmnViewer) { return; }
    const canvas = this.bpmnViewer.get('canvas');
    canvas.resized();
    canvas.zoom('fit-viewport', 'auto');
  }
  private disposeViewer() {
    if (this.bpmnViewer) { this.bpmnViewer.destroy(); this.bpmnViewer = null; }
  }
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    ++this.activeLoad;
    this.disposeViewer();
  }
}
