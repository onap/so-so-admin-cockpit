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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataService } from '../data.service';
import { ActivatedRoute, Router } from "@angular/router";
import { BpmnInfraRequest } from '../model/bpmnInfraRequest.model';
import { ActivityInstance } from '../model/activityInstance.model';
import { ProcessInstanceDetail } from '../model/processInstance.model';
import { ProcessDefinitionDetail } from '../model/processDefinition.model';
import { CommonModule } from '@angular/common';
// Angular 6's build optimizer strips inheritance from the unbundled viewer.
import Viewer from 'bpmn-js/dist/bpmn-navigated-viewer.production.min.js';
import { ViewEncapsulation } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { VariableInstance, VariableInstanceDisplay } from '../model/variableInstance.model';
import { ToastrNotificationService } from '../toastr-notification-service.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
  encapsulation: ViewEncapsulation.None
})

export class DetailsComponent implements OnInit, OnDestroy {

  private routeSubscription: Subscription;
  private activeLoad = 0;

  @ViewChild("canvas") elementReference: ElementRef;

  bpmnViewer: any;

  processInstanceID: string;

  processDefinitionID: string;

  processDefinitionName: string;

  activityInstance: ActivityInstance[] = [];

  processInstance: ProcessInstanceDetail;

  processDefinition: ProcessDefinitionDetail;

  variableInstance: VariableInstanceDisplay[];

  displayedColumns = ['activityId', 'activityName', 'activityType', 'startTime', 'endTime', 'durationInMillis'];

  displayedColumnsVariable = ['name', 'type', 'value'];

  constructor(private route: ActivatedRoute, private data: DataService, private popup: ToastrNotificationService,
    private router: Router, private spinner: NgxSpinnerService) { }

  async getActivityInstance(procInstId: string) {
    const load = this.activeLoad;
    await this.data.getActivityInstance(procInstId).then(
      (data: ActivityInstance[]) => {
        if (load !== this.activeLoad) { return; }
        this.activityInstance = data;
        console.log(data);
      }, error => {
        if (load !== this.activeLoad) { return; }
        this.spinner.hide();
        console.log(error);
        this.popup.error("Unable to get activity instance details for id: " + procInstId + " Error code:" + error.status);
      });
  }

  async getProcessDefinition(procDefId: string) {
    const load = this.activeLoad;
    await this.data.getProcessDefinition(procDefId).subscribe(
      async (data: ProcessDefinitionDetail) => {
        if (load !== this.activeLoad) { return; }
        this.processDefinition = data;
        console.log(data);
        await this.displayCamundaflow(this.processDefinition.processDefinitionXml, this.activityInstance,
          this.router, this.spinner, this.popup);
      }, error => {
        if (load !== this.activeLoad) { return; }
        this.spinner.hide();
        console.log(error);
        this.popup.error("Unable to get process definition for id: " + procDefId + " Error code:" + error.status);
      });
  }

  async getProcInstance(procInstId: string) {
    const load = this.activeLoad;
    await this.data.getProcessInstance(procInstId).then(
      async (data: ProcessInstanceDetail) => {
        if (load !== this.activeLoad) { return; }
        this.processInstance = data;
        this.processDefinitionID = this.processInstance.processDefinitionId;
        this.processDefinitionName = this.processInstance.processDefinitionName;
        console.log("Process definition id: " + this.processDefinitionID);
        await this.getActivityInstance(procInstId);
        if (load !== this.activeLoad) { return; }
        await this.getProcessDefinition(this.processDefinitionID);
      }, error => {
        if (load !== this.activeLoad) { return; }
        this.spinner.hide();
        console.log(error);
        this.popup.error("Unable to get process instance for id: " + procInstId + " Error code:" + error.status);
      });
  }

  displayCamundaflow(bpmnXml, activities: ActivityInstance[], router: Router,
    spinner: NgxSpinnerService, popup: ToastrNotificationService) {
    spinner.show();
    const load = this.activeLoad;

    this.bpmnViewer.importXML(bpmnXml, (error) => {
      if (load !== this.activeLoad) { return; }
      if (error) {
        console.error('Unable to load BPMN flow ', error);
        popup.error('Unable to load BPMN flow ');
        spinner.hide();
      } else {
        spinner.hide();
        let canvas = this.bpmnViewer.get('canvas');
        var eventBus = this.bpmnViewer.get('eventBus');
        var elementRegistry = this.bpmnViewer.get('elementRegistry');
        var overlays = this.bpmnViewer.get('overlays');

        activities.filter(a => elementRegistry.get(a.activityId)).forEach(a => {
          if (a.calledProcessInstanceId) {
            var element = elementRegistry.get(a.activityId);
            let newNode = document.createElement('div');
            newNode.className = 'highlight-overlay';
            newNode.id = element.id;
            newNode.style.width = element.width + "px";
            newNode.style.height = element.height + "px";
            newNode.style.cursor = "pointer";

            overlays.add(a.activityId, {
              position: {
                top: -5,
                left: -5
              },
              html: newNode
            });

            newNode.addEventListener('click', function(e) {
              console.log("clicked on: " + e.srcElement.id)
              activities.forEach(a => {
                if (a.activityId == e.srcElement.id && a.calledProcessInstanceId !== null) {
                  console.log("will drill down to : " + a.calledProcessInstanceId);
                  router.navigate(['/details/' + a.calledProcessInstanceId]);
                }
              });
            });
          }
        });
        // zoom to fit full viewport
        canvas.zoom('fit-viewport', 'auto');
        activities.forEach(a => {
          if (elementRegistry.get(a.activityId)) {
            canvas.addMarker(a.activityId, 'highlight');
          }
        });
      }
    });
  }

  zoomIn() {
    this.bpmnViewer.get('zoomScroll').zoom(1, {
      x: this.elementReference.nativeElement.offsetWidth / 2,
      y: this.elementReference.nativeElement.offsetHeight / 2
    });
  }

  zoomOut() {
    this.bpmnViewer.get('zoomScroll').zoom(-1, {
      x: this.elementReference.nativeElement.offsetWidth / 2,
      y: this.elementReference.nativeElement.offsetHeight / 2
    });
  }
  resetZoom() {
    let canvas = this.bpmnViewer.get('canvas');
    canvas.resized();
    canvas.zoom('fit-viewport', 'auto');

  }

  getVarInst(procInstId: string) {
    const load = this.activeLoad;
    this.data.getVariableInstance(procInstId).subscribe(
      (data: VariableInstance[]) => {
        if (load !== this.activeLoad) { return; }
        this.variableInstance = data.map(variable => {
          const rawValue = variable.value;
          const value = typeof rawValue === 'object'
            ? (rawValue === null ? null : JSON.stringify(rawValue, null, 2)) : rawValue;
          return { name: variable.name, type: variable.type, value };
        });
        console.log(data);
      }, error => {
        if (load !== this.activeLoad) { return; }
        this.spinner.hide();
        console.log(error);
        this.popup.error("Unable to get Variable instances for id: " + procInstId + " Error code:" + error.status);
      });
  }

  ngOnDestroy() {
    this.activeLoad++;
    this.spinner.hide();
    if (this.routeSubscription) { this.routeSubscription.unsubscribe(); }
    if (this.bpmnViewer) { this.bpmnViewer.destroy(); }
  }

  createViewer() {
    return new Viewer({ container: '.canvas' });
  }

  async ngOnInit() {
    this.bpmnViewer = this.createViewer();
    this.routeSubscription = this.route.params.subscribe(
      async params => {
        const load = ++this.activeLoad;
        this.activityInstance = [];
        this.processInstanceID = params.id as string;
        console.log("Will GET BpmnInfraRequest instance using id: " + this.processInstanceID);
        await this.getProcInstance(this.processInstanceID);
        if (load !== this.activeLoad) { return; }
        this.getVarInst(this.processInstanceID);
      });
  }

}
