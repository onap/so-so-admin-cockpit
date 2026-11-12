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

import { SearchData } from './searchData.model';
describe('Search criteria', () => {
  let data: SearchData;
  beforeEach(() => {
    data = new SearchData();
    data.startDate = new Date(2020, 0, 2, 8, 0, 0, 0);
    data.endDate = new Date(2020, 0, 2, 9, 0, 0, 0);
    data.selectedStartHour = '08';
    data.selectedStartMinute = '00';
    data.selectedEndHour = '09';
    data.selectedEndMinute = '00';
  });
  (['startDate', 'endDate'] as Array<'startDate' | 'endDate'>).forEach((field) =>
    it('rejects a missing ' + field, () => {
      data[field] = null;
      data.getSearchRequest().subscribe(
        () => fail('expected rejection'),
        (e) => expect(e).toContain('date')
      );
    })
  );
  it('rejects reversed dates', () => {
    data.selectedStartHour = '10';
    data.getSearchRequest().subscribe(
      () => fail('expected rejection'),
      (e) => expect(e).toContain('End time')
    );
  });
  it('accepts equal time bounds', () => {
    data.selectedEndHour = '08';
    data
      .getSearchRequest()
      .subscribe((r) =>
        expect(r.getStartTimeInMilliseconds()).toBe(
          r.getEndTimeInMilliseconds()
        )
      );
  });
  it('omits empty filters and ALL status and preserves exact time bounds', () => {
    data.getSearchRequest().subscribe((r) => {
      expect(r.getFilters()).toEqual({});
      expect(r.getStartTimeInMilliseconds()).toBe(
        new Date(2020, 0, 2, 8, 0).getTime()
      );
      expect(r.getEndTimeInMilliseconds()).toBe(
        new Date(2020, 0, 2, 9, 0).getTime()
      );
    });
  });
  it('includes values with their selected operators and explicit status', () => {
    data.serviceInstanceId = 'id';
    data.requestId = 'req';
    data.serviceInstanceName = 'demo';
    data.selectedValueSN = 'LIKE';
    data.selectedValueSTATUS = 'FAILED';
    data
      .getSearchRequest()
      .subscribe((r) =>
        expect(r.getFilters()).toEqual({
          serviceInstanceId: ['EQ', 'id'],
          requestId: ['EQ', 'req'],
          serviceInstanceName: ['LIKE', 'demo'],
          requestStatus: ['EQ', 'FAILED']
        })
      );
  });
});
