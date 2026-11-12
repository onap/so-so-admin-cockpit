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

import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { Observable } from 'rxjs';
import { ActivityInstance } from './model/activityInstance.model';
import { ProcessInstanceDetail } from './model/processInstance.model';
import { ProcessDefinitionDetail } from './model/processDefinition.model';
import { VariableInstance } from './model/variableInstance.model';
import { ServiceRecipeResponse, NetworkRecipeResponse, VnfRecipeResponse } from './model/api-response.model';
import { SearchFilters } from './model/SearchRequest.model';
import { DataService } from './data.service';
import { ToastrNotificationService } from './toastr-notification-service.service';
import { environment } from '../environments/environment';
import { notificationStub } from './testing/component-test';
import { request, process, activity, serviceRecipe, networkRecipe, vnfRecipe } from './testing/api-fixtures';

type HttpGetResponse = ActivityInstance[] | ProcessInstanceDetail | ProcessDefinitionDetail | VariableInstance[] |
  ServiceRecipeResponse | NetworkRecipeResponse | VnfRecipeResponse;
type HttpGetCase = [() => Observable<HttpGetResponse | null>, string, HttpGetResponse];

describe('DataService HTTP contract', () => {
  let service: DataService, http: HttpTestingController, popup: jasmine.SpyObj<Pick<ToastrNotificationService, 'error' | 'info'>>;
  const base = environment.soMonitoringBackendURL;
  beforeEach(() => {
    popup = notificationStub();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DataService,
        { provide: ToastrNotificationService, useValue: popup }
      ]
    });
    service = TestBed.get(DataService);
    http = TestBed.get(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('posts filters and time bounds and returns search rows', () => {
    const filters: SearchFilters = { requestStatus: ['EQ', 'COMPLETE'] };
    service
      .getBpmnInfraRequest(filters, 100, 200)
      .subscribe((rows) => expect(rows).toEqual([request]));
    const req = http.expectOne(base + '/v1/search?from=100&to=200');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(filters);
    req.flush([request]);
  });
  it('retains the lookup HTTP response and process ID', () => {
    service.getProcessInstanceId('request-1').subscribe((r) => {
      expect(r.status).toBe(200);
      expect(r.body && r.body.processInstanceId).toBe('process-1');
    });
    const req = http.expectOne(base + '/process-instance-id/request-1');
    expect(req.request.method).toBe('GET');
    req.flush({ processInstanceId: 'process-1' });
  });
  const processCases: HttpGetCase[] = [
    [() => service.getActivityInstance('process-1'), 'activity-instance', [activity]],
    [() => service.getProcessInstance('process-1'), 'process-instance', process]
  ];
  processCases.forEach(([call, path, value]) => {
    it('returns ' + path + ' from its GET response', () => {
      call().subscribe(data => expect(data).toEqual(value));
      const req = http.expectOne(base + '/' + path + '/process-1');
      expect(req.request.method).toBe('GET');
      req.flush(value);
    });
  });
  const getCases: HttpGetCase[] = [
    [
      () => service.getProcessDefinition('id'),
      '/process-definition/id',
      { processDefinitionId: 'id', processDefinitionXml: '<xml/>' },
    ],
    [
      () => service.getVariableInstance('id'),
      '/variable-instance/id',
      [{ name: 'region', type: 'String', value: 'west' }, { name: 'config', type: 'Object', value: { enabled: true, values: [null, 4] } }],
    ],
    [() => service.getServiceRecipe(), '/serviceRecipes', { serviceRecipes: [serviceRecipe] }],
    [() => service.getNetworkRecipe(), '/networkRecipes', { networkRecipes: [networkRecipe] }],
    [() => service.getVnfRecipe(), '/vnfRecipes', { vnfRecipes: [vnfRecipe] }]
  ];
  getCases.forEach(([call, path, value]) => {
    it('returns ' + path + ' response without changing its shape', () => {
      call().subscribe((data) => expect(data).toEqual(value));
      const req = http.expectOne(base + path);
      expect(req.request.method).toBe('GET');
      req.flush(value);
    });
  });
  it('sends multipart file without forcing a content boundary', () => {
    const form = new FormData();
    form.append('file', new File(['archive'], 'workflow.war'));
    service
      .onboardBPMNInfra(form)
      .subscribe((data) => expect(data).toEqual({ result: 'true' }));
    const req = http.expectOne(base + '/workflowPackages/onboard');
    expect(req.request.method).toBe('POST');
    expect((req.request.body.get('file') as File).name).toBe('workflow.war');
    expect(req.request.headers.has('Content-Type')).toBe(false);
    req.flush({ result: 'true' });
  });
  it('posts the recipe JSON exactly once', () => {
    const body = {
      modelType: 'Service' as 'Service',
      modelVersionId: 'uuid',
      operation: 'create',
      orchestrationFlow: 'flow'
    };
    const response = Object.assign({}, body, { id: '1' });
    service
      .saveServiceRecipe(body)
      .subscribe((data) => expect(data).toEqual(response));
    const req = http.expectOne(base + '/serviceRecipes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(body);
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(req.request.serializeBody()).toBe(
      '{"modelType":"Service","modelVersionId":"uuid","operation":"create","orchestrationFlow":"flow"}'
    );
    req.flush(response, { status: 201, statusText: 'Created' });
  });
  [400, 404, 500].forEach((status) =>
    it(
      'retains HTTP ' + status + ' status and body without notifying',
      () => {
        const body = { message: 'failure' };
        service.getVariableInstance('id').subscribe(
          () => fail('expected failure'),
          (error) => {
            expect(error.status).toBe(status);
            expect(error.error).toEqual(body);
            expect(error.url).toBe(base + '/variable-instance/id');
          }
        );
        http
          .expectOne(base + '/variable-instance/id')
          .flush(body, { status, statusText: 'Failure' });
        expect(popup.error).not.toHaveBeenCalled();
      }
    )
  );
  it('retains process-request errors through the Observable', () => {
    service.getProcessInstance('id').subscribe(
      () => fail('expected error'),
      error => {
        expect(error.status).toBe(404);
        expect(error.error).toEqual({ message: 'missing' });
      }
    );
    http.expectOne(base + '/process-instance/id')
      .flush({ message: 'missing' }, { status: 404, statusText: 'Not Found' });
  });
  it('cancels an activity HTTP request when its subscriber leaves', () => {
    const subscription = service.getActivityInstance('id').subscribe();
    const pending = http.expectOne(base + '/activity-instance/id');
    subscription.unsubscribe();
    expect(pending.cancelled).toBe(true);
  });
  it('retains network error details without notifying', () => {
    service.getVariableInstance('id').subscribe(
      () => fail('expected failure'),
      (e) => {
        expect(e.status).toBe(0);
        expect(e.error.message).toBe('offline');
      }
    );
    http
      .expectOne(base + '/variable-instance/id')
      .error(new ErrorEvent('network', { message: 'offline' }));
    expect(popup.error).not.toHaveBeenCalled();
  });
  const recipeCases: Array<[() => Observable<HttpGetResponse | null>, string]> = [
    [() => service.getServiceRecipe(), '/serviceRecipes'],
    [() => service.getNetworkRecipe(), '/networkRecipes'],
    [() => service.getVnfRecipe(), '/vnfRecipes']
  ];
  recipeCases.forEach(([call, path]) => {
    [{ errMsg: 'Unable to process.' }, null].forEach((body) => {
      it('preserves the application error or null body for ' + path + ': ' + JSON.stringify(body), () => {
        call().subscribe((data) => expect(data).toEqual(body));
        http.expectOne(base + path).flush(body);
        expect(popup.error).not.toHaveBeenCalled();
      });
    });
  });
  [{ errMsg: 'The service template does not exist.' }, null].forEach((body) => {
    it('preserves a recipe save application failure: ' + JSON.stringify(body), () => {
      const payload = { modelType: 'Service' as 'Service', modelVersionId: 'uuid', operation: 'create', orchestrationFlow: 'flow' };
      service.saveServiceRecipe(payload).subscribe((data) => expect(data).toEqual(body));
      const req = http.expectOne(base + '/serviceRecipes');
      expect(req.request.body).toEqual(payload);
      req.flush(body);
    });
  });
  [{ errMsg: 'Unable to process.' }, null].forEach((body) => {
    it('preserves a workflow upload failure: ' + JSON.stringify(body), () => {
      const form = new FormData();
      form.append('file', new File(['archive'], 'workflow.war'));
      service.onboardBPMNInfra(form).subscribe((data) => expect(data).toEqual(body));
      const req = http.expectOne(base + '/workflowPackages/onboard');
      expect(req.request.body).toBe(form);
      expect(req.request.headers.has('Content-Type')).toBe(false);
      req.flush(body);
    });
  });
});
