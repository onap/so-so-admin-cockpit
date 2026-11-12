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

import { Observable, throwError, of } from 'rxjs';
import { SearchRequest, SearchFilters } from './SearchRequest.model';
import { Input } from '@angular/core';

export class SearchData {

  @Input() selectedValueSII = 'EQ';
  @Input() selectedValueRI = 'EQ';
  @Input() selectedValueSN = 'EQ';
  @Input() selectedValueSTATUS = 'ALL';

  private now = Date.now();
  private initialStartDate = new Date(this.now - (1 * 60 * 60 * 1000));
  private initialEndDate = new Date(this.now);
  // Minus 1 hour from current time for start date
  @Input() startDate: Date | null = this.initialStartDate;
  @Input() selectedStartHour = this.getNumberAsString(this.initialStartDate.getHours());
  @Input() selectedStartMinute = this.getNumberAsString(this.initialStartDate.getMinutes());

  @Input() endDate: Date | null = this.initialEndDate;
  @Input() selectedEndHour = this.getNumberAsString(this.initialEndDate.getHours());
  @Input() selectedEndMinute = this.getNumberAsString(this.initialEndDate.getMinutes());


  @Input() serviceInstanceId = '';
  @Input() requestId = '';
  @Input() serviceInstanceName = '';


  constructor() {
  }

  public getSearchRequest(): Observable<SearchRequest> {
    const searchFields: SearchFilters = {};
    if ((!this.startDate || this.startDate === null) || (!this.endDate || this.endDate === null)) {
      console.error('Found either start time or end time null or undefined');
      return throwError('Found end or start date empty, Please enter start and end date');
    }

    this.startDate.setHours(parseInt(this.selectedStartHour, 10));
    this.startDate.setMinutes(parseInt(this.selectedStartMinute, 10));

    this.endDate.setHours(parseInt(this.selectedEndHour, 10));
    this.endDate.setMinutes(parseInt(this.selectedEndMinute, 10));

    const startTimeInMilliseconds = this.startDate.getTime();
    const endTimeInMilliseconds = this.endDate.getTime();

    if (startTimeInMilliseconds > endTimeInMilliseconds) {
      console.error('End time: ' + this.endDate + ' can not be greater then start time: ' + this.startDate);
      return throwError('End time: ' + this.endDate + ' can not be greater then start time: ' + this.startDate);
    }


    if (!this.isEmpty(this.selectedValueSII) && !this.isEmpty(this.serviceInstanceId)) {
      searchFields['serviceInstanceId'] = [this.selectedValueSII, this.serviceInstanceId];
    }
    if (!this.isEmpty(this.selectedValueRI) && !this.isEmpty(this.requestId)) {
      searchFields['requestId'] = [this.selectedValueRI, this.requestId];
    }
    if (!this.isEmpty(this.selectedValueSN) && !this.isEmpty(this.serviceInstanceName)) {
      searchFields['serviceInstanceName'] = [this.selectedValueSN, this.serviceInstanceName];
    }

    if (!this.isEmpty(this.selectedValueSTATUS) && this.selectedValueSTATUS !== 'ALL') {
      searchFields['requestStatus'] = ['EQ', this.selectedValueSTATUS];
    }

    return of(new SearchRequest(searchFields, startTimeInMilliseconds, endTimeInMilliseconds));
  }

  private isEmpty(str: string) {
    return (!str || 0 === str.length);
  }

  private getNumberAsString(num: number) {
    if (num <= 9) {
      return '0' + num;
    }
    return '' + num;
  }

}
