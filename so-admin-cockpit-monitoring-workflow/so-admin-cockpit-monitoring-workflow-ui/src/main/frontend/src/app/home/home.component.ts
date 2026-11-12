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

@authors: ronan.kenny@ericsson.com, waqas.ikram@ericsson.com, andrei.barcovschi@ericsson.com
*/

import { Component, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { DataService } from '../data.service';
import { ActivatedRoute, Router } from "@angular/router";
import { BpmnInfraRequest } from '../model/bpmnInfraRequest.model';
import { ProcessInstanceId } from '../model/processInstanceId.model';
import { ToastrNotificationService } from '../toastr-notification-service.service';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule, FormControl } from '@angular/forms';
import { SearchData } from '../model/searchData.model';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { SearchRequest } from '../model/SearchRequest.model';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatFormFieldModule, MatInputModule, MatPaginator, MatSort, MatTableDataSource } from '@angular/material';
import { Constants } from './home.constant';
import { Subject, EMPTY, defer } from 'rxjs';
import { map, switchMap, catchError, finalize, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  encapsulation: ViewEncapsulation.None
})

export class HomeComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  private searches$ = new Subject<number>();
  private lookups$ = new Subject<{ requestId: string; load: number }>();
  private loadingOwner = 0;

  totalVal = 0;
  completeVal = 0;
  inProgressVal = 0;
  failedVal = 0;
  pendingVal = 0;
  unlockedVal = 0;
  percentageComplete = 0;
  percentageFailed = 0;
  percentageInProg = 0;
  percentagePending = 0;
  percentageUnlocked = 0;

  options = Constants.OPTIONS;
  statusOptions = Constants.STATUS_OPTIONS;
  hourOptions = Constants.HOUR_OPTIONS;
  minuteOptions = Constants.MINUTE_OPTIONS;
  displayedColumns = Constants.DISPLAYED_COLUMNS;
  pageSizeOptions = Constants.DEFAULT_PAGE_SIZE_OPTIONS;

  searchData: SearchData;
  startingDate: Date;
  processData: MatTableDataSource<BpmnInfraRequest>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(private route: ActivatedRoute, private data: DataService,
    private router: Router, private popup: ToastrNotificationService,
    private spinner: NgxSpinnerService) {
    this.searchData = new SearchData();
    this.searches$.pipe(
      switchMap(load => defer(() => this.searchData.getSearchRequest()).pipe(
        catchError(error => { this.popup.error(error); return EMPTY; }),
        switchMap(result => this.data.getBpmnInfraRequest(
          result.getFilters(), result.getStartTimeInMilliseconds(), result.getEndTimeInMilliseconds()
        ).pipe(catchError(error => {
          if (load === this.loadingOwner) {
            this.popup.error('Unable to perform search Error code:' + error.status);
          }
          return EMPTY;
        }))),
        map(rows => ({ rows, load })),
        finalize(() => this.finishLoading(load))
      )),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result.load === this.loadingOwner) { this.showResults(result.rows); }
    });
    this.lookups$.pipe(
      switchMap(operation => this.data.getProcessInstanceId(operation.requestId).pipe(
        map(response => ({ response, operation })),
        catchError(() => {
          if (operation.load === this.loadingOwner) { this.lookupFailed(operation.requestId); }
          return EMPTY;
        }),
        finalize(() => this.finishLoading(operation.load))
      )),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result.operation.load !== this.loadingOwner) { return; }
      const response = result.response;
      if (response.status === 200 && response.body && response.body.processInstanceId) {
        this.router.navigate(['/details/' + response.body.processInstanceId]);
      } else {
        this.lookupFailed(result.operation.requestId);
      }
    });
  }

  makeCall() {
    this.searches$.next(this.beginLoading());
  }

  getProcessInstanceId(requestId: string) {
    this.lookups$.next({ requestId, load: this.beginLoading() });
  }

  private beginLoading(): number {
    this.spinner.show();
    return ++this.loadingOwner;
  }

  private finishLoading(load: number) {
    if (load === this.loadingOwner) { this.spinner.hide(); }
  }

  private lookupFailed(requestId: string) {
    this.popup.error('No process instance id found: ' + requestId);
  }

  private showResults(processData: BpmnInfraRequest[]) {
    this.processData = new MatTableDataSource<BpmnInfraRequest>(processData);
    this.processData.sort = this.sort;
    this.processData.paginator = this.paginator;
    this.processData.paginator.firstPage();
    this.popup.info('Number of records found: ' + processData.length);
          // Calculate Statistics for Service Statistics tab
          this.completeVal = processData.filter(i => i.requestStatus === "COMPLETE").length;
          this.inProgressVal = processData.filter(i => i.requestStatus === "IN_PROGRESS").length;
          this.failedVal = processData.filter(i => i.requestStatus === "FAILED").length;
          this.pendingVal = processData.filter(i => i.requestStatus === "PENDING").length;
          this.unlockedVal = processData.filter(i => i.requestStatus === "UNLOCKED").length;
          this.totalVal = processData.length;

          // Calculate percentages to 2 decimal places and compare to 0 to avoid NaN error
          this.percentageComplete = this.percentageFailed = this.percentageInProg = this.percentagePending = this.percentageUnlocked = 0;
          if (this.totalVal != 0) {
            this.percentageComplete = Math.round(((this.completeVal / this.totalVal) * 100) * 100) / 100;
            this.percentageFailed = Math.round(((this.failedVal / this.totalVal) * 100) * 100) / 100;
            this.percentageInProg = Math.round(((this.inProgressVal / this.totalVal) * 100) * 100) / 100;
            this.percentagePending = Math.round(((this.pendingVal / this.totalVal) * 100) * 100) / 100;
            this.percentageUnlocked = Math.round(((this.unlockedVal / this.totalVal) * 100) * 100) / 100;
          }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.searches$.complete();
    this.lookups$.complete();
  }
}
