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

@authors: ronan.kenny@ericsson.com, waqas.ikram@ericsson.com
*/

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BpmnInfraRequest } from './model/bpmnInfraRequest.model';
import { catchError } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ProcessInstanceId } from './model/processInstanceId.model';
import { environment } from '../environments/environment';
import { HttpResponse } from '@angular/common/http';
import { ProcessInstanceDetail } from './model/processInstance.model';
import { HttpErrorHandlerService } from './http-error-handler.service';
import { ActivityInstance } from './model/activityInstance.model';
import { ProcessDefinitionDetail } from './model/processDefinition.model';
import { VariableInstance } from './model/variableInstance.model';
import { RecipeRequest } from './model/recipeRequest.model';
import {
  ServiceRecipeResponse, NetworkRecipeResponse, VnfRecipeResponse,
  RecipeSaveResponse, WorkflowOnboardResponse
} from './model/api-response.model';


@Injectable({
  providedIn: 'root'
})
export class DataService {
  constructor(private http: HttpClient, private httpErrorHandlerService: HttpErrorHandlerService) { }

  // HTTP POST call to running Spring Boot application
  getBpmnInfraRequest(servInstId: {}, from: number, to: number): Observable<BpmnInfraRequest[]> {
    var url = environment.soMonitoringBackendURL + '/v1/search?from=' + from + "&to=" + to;
    return this.http.post<BpmnInfraRequest[]>(url, servInstId)
      .pipe(
        catchError(this.httpErrorHandlerService.handleError("POST", url))
      );
  }

  // HTTP GET to return Process Instance using RequestID
  getProcessInstanceId(requestId: string): Observable<HttpResponse<ProcessInstanceId>> {
    var url = environment.soMonitoringBackendURL + '/process-instance-id/' + requestId;
    console.log(requestId);
    return this.http.get<ProcessInstanceId>(url, { observe: 'response' })
      .pipe(
        catchError(this.httpErrorHandlerService.handleError("GET", url))
      );
  }

  // HTTP GET to return Activity instancs using ProcessInstanceID
  getActivityInstance(processInstanceId: string): Observable<ActivityInstance[]> {
    var url = environment.soMonitoringBackendURL + '/activity-instance/' + processInstanceId;
    return this.http.get<ActivityInstance[]>(url)
      .pipe(
        catchError(this.httpErrorHandlerService.handleError("GET", url))
      );
  }

  // HTTP GET to return Activity Instance using ProcessInstanceID
  getProcessInstance(processInstanceId: string): Observable<ProcessInstanceDetail> {
    var url = environment.soMonitoringBackendURL + '/process-instance/' + processInstanceId;
    return this.http.get<ProcessInstanceDetail>(url)
      .pipe(
        catchError(this.httpErrorHandlerService.handleError("GET", url)));
  }

  // HTTP GET to return Process Definition using processDefinitionId
  getProcessDefinition(processDefinitionId: string): Observable<ProcessDefinitionDetail> {
    var url = environment.soMonitoringBackendURL + '/process-definition/' + processDefinitionId;
    return this.http.get<ProcessDefinitionDetail>(url).pipe(
      catchError(this.httpErrorHandlerService.handleError("GET", url))
    );
  }

  // HTTP GET to return Variable Instance using ProcessInstanceID
  getVariableInstance(processDefinitionId: string): Observable<VariableInstance[]> {
    var url = environment.soMonitoringBackendURL + '/variable-instance/' + processDefinitionId;
    return this.http.get<VariableInstance[]>(url).pipe(
      catchError(this.httpErrorHandlerService.handleError("GET", url))
    );
  }

  onboardBPMNInfra(formData: FormData): Observable<WorkflowOnboardResponse | null> {
    var url = environment.soMonitoringBackendURL + '/workflowPackages/onboard';
    return this.http.post<WorkflowOnboardResponse | null>(url, formData)
      .pipe(
        catchError(this.httpErrorHandlerService.handleError("POST", url))
      );
  }

  saveServiceRecipe(data: RecipeRequest): Observable<RecipeSaveResponse | null> {
   const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json',
      })
    };
    var url = environment.soMonitoringBackendURL + '/serviceRecipes';
    return this.http.post<RecipeSaveResponse | null>(url, data, httpOptions)
      .pipe(
        catchError(this.httpErrorHandlerService.handleError("POST", url))
      );
  }

  getServiceRecipe(): Observable<ServiceRecipeResponse | null> {
    const httpOptions = {
       headers: new HttpHeaders({
         'Content-Type':  'application/json',
       })
     };
     var url = environment.soMonitoringBackendURL + '/serviceRecipes';
     return this.http.get<ServiceRecipeResponse | null>(url, httpOptions)
       .pipe(
         catchError(this.httpErrorHandlerService.handleError("GET", url))
       );
   }

   getNetworkRecipe(): Observable<NetworkRecipeResponse | null> {
    const httpOptions = {
       headers: new HttpHeaders({
         'Content-Type':  'application/json',
       })
     };
     var url = environment.soMonitoringBackendURL + '/networkRecipes';
     return this.http.get<NetworkRecipeResponse | null>(url, httpOptions)
       .pipe(
         catchError(this.httpErrorHandlerService.handleError("GET", url))
       );
   }

   getVnfRecipe(): Observable<VnfRecipeResponse | null> {
    const httpOptions = {
       headers: new HttpHeaders({
         'Content-Type':  'application/json',
       })
     };
     var url = environment.soMonitoringBackendURL + '/vnfRecipes';
     return this.http.get<VnfRecipeResponse | null>(url, httpOptions)
       .pipe(
         catchError(this.httpErrorHandlerService.handleError("GET", url))
       );
   }

}
