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
import { HomeComponent } from './home.component';
import { DataService } from '../data.service';
import { ToastrNotificationService } from '../toastr-notification-service.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import {
  componentImports,
  notificationStub,
  spinnerStub
} from '../testing/component-test';
import { request } from '../testing/api-fixtures';
describe('Search workflow', () => {
  let fixture: ComponentFixture<HomeComponent>,
    component: HomeComponent,
    api: any,
    popup: any,
    spinner: any,
    router: Router;
  beforeEach(() => {
    api = jasmine.createSpyObj('api', [
      'getBpmnInfraRequest',
      'getProcessInstanceId'
    ]);
    popup = notificationStub();
    spinner = spinnerStub();
    TestBed.configureTestingModule({
      imports: componentImports,
      declarations: [HomeComponent],
      providers: [
        { provide: DataService, useValue: api },
        { provide: ToastrNotificationService, useValue: popup },
        { provide: NgxSpinnerService, useValue: spinner }
      ]
    });
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    router = TestBed.get(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });
  function search(rows: any[]) {
    api.getBpmnInfraRequest.and.returnValue(of(rows));
    component.makeCall();
    fixture.detectChanges();
  }
  it('submits an entered request criterion and renders returned rows', fakeAsync(() => {
    const input = fixture.nativeElement.querySelector(
      'input[placeholder="Request Id"]'
    );
    input.value = 'request-1';
    input.dispatchEvent(new Event('input'));
    tick();
    api.getBpmnInfraRequest.and.returnValue(of([request]));
    fixture.nativeElement.querySelector('button.fa-search').click();
    tick();
    fixture.detectChanges();
    expect(api.getBpmnInfraRequest.calls.mostRecent().args[0]).toEqual({
      requestId: ['EQ', 'request-1']
    });
    expect(fixture.nativeElement.textContent).toContain('Demo service');
    expect(spinner.hide).toHaveBeenCalled();
  }));
  it('counts each status and rounds percentages with unknown statuses in the denominator', () => {
    search(
      [
        'COMPLETE',
        'IN_PROGRESS',
        'FAILED',
        'PENDING',
        'UNLOCKED',
        'UNKNOWN'
      ].map((requestStatus) => Object.assign({}, request, { requestStatus }))
    );
    expect([
      component.completeVal,
      component.inProgressVal,
      component.failedVal,
      component.pendingVal,
      component.unlockedVal
    ]).toEqual([1, 1, 1, 1, 1]);
    expect(component.totalVal).toBe(6);
    expect([
      component.percentageComplete,
      component.percentageInProg,
      component.percentageFailed,
      component.percentagePending,
      component.percentageUnlocked
    ]).toEqual([16.67, 16.67, 16.67, 16.67, 16.67]);
  });
  it('clears rows, totals and percentages after a subsequent empty result', () => {
    search([request]);
    search([]);
    expect(component.totalVal).toBe(0);
    expect(component.processData.data).toEqual([]);
    expect([
      component.percentageComplete,
      component.percentageInProg,
      component.percentageFailed,
      component.percentagePending,
      component.percentageUnlocked
    ]).toEqual([0, 0, 0, 0, 0]);
    expect(fixture.nativeElement.textContent).not.toContain('Demo service');
  });
  it('rejects invalid dates without calling the API and stops loading', () => {
    component.searchData.startDate = null;
    component.makeCall();
    expect(api.getBpmnInfraRequest).not.toHaveBeenCalled();
    expect(popup.error).toHaveBeenCalled();
    expect(spinner.hide).toHaveBeenCalled();
  });
  it('shows a search failure and stops loading', () => {
    api.getBpmnInfraRequest.and.returnValue(throwError({ status: 500 }));
    component.makeCall();
    expect(popup.error).toHaveBeenCalledWith(
      jasmine.stringMatching('Unable to perform search')
    );
    expect(spinner.hide).toHaveBeenCalled();
  });
  it('navigates using a successful lookup response', () => {
    api.getProcessInstanceId.and.returnValue(
      of(new HttpResponse({ body: { processInstanceId: 'process-1' } }))
    );
    component.getProcessInstanceId('request-1');
    expect(router.navigate).toHaveBeenCalledWith(['/details/process-1']);
    expect(spinner.hide).toHaveBeenCalled();
  });
  it('reports a genuine HTTP lookup failure without navigation or stuck loading', () => {
    api.getProcessInstanceId.and.returnValue(
      throwError({ message: 'missing' })
    );
    component.getProcessInstanceId('request-1');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(popup.error).toHaveBeenCalledWith(
      jasmine.stringMatching('No process instance')
    );
    expect(spinner.hide).toHaveBeenCalled();
  });
  it('reports an unsuccessful lookup response without navigation', () => {
    api.getProcessInstanceId.and.returnValue(
      of(new HttpResponse({ status: 404 }))
    );
    component.getProcessInstanceId('missing');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(popup.error).toHaveBeenCalled();
    expect(spinner.hide).toHaveBeenCalled();
  });
  it('keeps the latest search rows when responses arrive in reverse order', () => {
    const first = new Subject<any[]>(), second = new Subject<any[]>();
    api.getBpmnInfraRequest.and.returnValues(first, second);
    component.makeCall();
    component.makeCall();
    expect(spinner.hide).not.toHaveBeenCalled();
    second.next([Object.assign({}, request, { serviceInstanceName: 'Latest' })]);
    second.complete();
    first.next([request]);
    first.complete();
    expect(component.processData.data[0].serviceInstanceName).toBe('Latest');
    expect(popup.info.calls.count()).toBe(1);
  });
  it('retains loading ownership across overlapping search and lookup', () => {
    const rows = new Subject<any[]>(), lookup = new Subject<any>();
    api.getBpmnInfraRequest.and.returnValue(rows);
    api.getProcessInstanceId.and.returnValue(lookup);
    component.makeCall();
    component.getProcessInstanceId('request-1');
    spinner.hide.calls.reset();
    rows.next([request]);
    rows.complete();
    expect(spinner.hide).not.toHaveBeenCalled();
    lookup.error({ status: 404 });
    expect(spinner.hide).toHaveBeenCalledTimes(1);
  });
  it('cancels pending work on destruction without late results or navigation', () => {
    const rows = new Subject<any[]>(), lookup = new Subject<any>();
    api.getBpmnInfraRequest.and.returnValue(rows);
    api.getProcessInstanceId.and.returnValue(lookup);
    component.makeCall();
    component.getProcessInstanceId('request-1');
    fixture.destroy();
    rows.next([request]);
    lookup.next(new HttpResponse({ body: { processInstanceId: 'late' } }));
    expect(component.processData).toBeUndefined();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(spinner.hide).toHaveBeenCalled();
  });
  it('permits another search after the latest request failed', () => {
    const stale = new Subject<any[]>();
    api.getBpmnInfraRequest.and.returnValues(stale, throwError({ status: 500 }), of([]));
    component.makeCall();
    component.makeCall();
    stale.next([request]);
    expect(component.processData).toBeUndefined();
    component.makeCall();
    expect(component.processData.data).toEqual([]);
    expect(spinner.hide).toHaveBeenCalled();
  });
  it('does not navigate for an older lookup after a newer search starts', () => {
    const lookup = new Subject<any>();
    api.getProcessInstanceId.and.returnValue(lookup);
    api.getBpmnInfraRequest.and.returnValue(of([]));
    component.getProcessInstanceId('request-1');
    component.makeCall();
    lookup.next(new HttpResponse({ body: { processInstanceId: 'obsolete' } }));
    lookup.complete();
    expect(router.navigate).not.toHaveBeenCalled();
  });
  it('does not report a stale search failure over a pending lookup', () => {
    const rows = new Subject<any[]>(), lookup = new Subject<any>();
    api.getBpmnInfraRequest.and.returnValue(rows);
    api.getProcessInstanceId.and.returnValue(lookup);
    component.makeCall(); component.getProcessInstanceId('request-1');
    rows.error({ status: 500 });
    expect(popup.error).not.toHaveBeenCalled();
    lookup.complete();
  });
  it('does not report a stale lookup failure over a newer search', () => {
    const lookup = new Subject<any>();
    api.getProcessInstanceId.and.returnValue(lookup);
    api.getBpmnInfraRequest.and.returnValue(of([]));
    component.getProcessInstanceId('request-1'); component.makeCall();
    lookup.error({ status: 404 });
    expect(popup.error).not.toHaveBeenCalled();
  });
  [null, { processInstanceId: '' }].forEach(body => {
    it('rejects a lookup without a process ID: ' + JSON.stringify(body), () => {
      api.getProcessInstanceId.and.returnValue(of(new HttpResponse({ body })));
      component.getProcessInstanceId('request-1');
      expect(router.navigate).not.toHaveBeenCalled();
      expect(popup.error).toHaveBeenCalled();
      expect(spinner.hide).toHaveBeenCalled();
    });
  });
  it('sorts and pages the rendered result set', fakeAsync(() => {
    search(
      Array.from({ length: 12 }, (_, i) =>
        Object.assign({}, request, {
          requestId: 'request-' + i,
          serviceInstanceName: 'Service ' + i
        })
      )
    );
    tick();
    fixture.detectChanges();
    const next = fixture.nativeElement.querySelector(
      'button[aria-label="Next page"]'
    );
    expect(next.disabled).toBe(false);
    next.click();
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('mat-row').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Service 10');
    expect(fixture.nativeElement.textContent).not.toContain('Service 0');
    fixture.nativeElement.querySelector('[mat-sort-header]').click();
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Service 8');
    expect(fixture.nativeElement.textContent).not.toContain('Service 10');
  }));
});
