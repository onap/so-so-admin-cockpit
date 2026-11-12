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

import { ToastrNotificationService, ToastrRuntime } from './toastr-notification-service.service';
describe('Toastr notification adapter', () => {
  const host = window as Window & { toastr: ToastrRuntime };
  let original: ToastrRuntime, stub: jasmine.SpyObj<ToastrRuntime>, service: ToastrNotificationService;
  beforeEach(() => {
    original = host.toastr;
    stub = jasmine.createSpyObj<ToastrRuntime>('toastr', ['info', 'error']);
    host.toastr = stub;
    service = new ToastrNotificationService();
  });
  afterEach(() => (host.toastr = original));
  it('shows error messages with the error title', () => {
    service.error('failed');
    expect(stub.error).toHaveBeenCalledWith('failed', 'Error');
  });
  it('shows informational messages with the info title', () => {
    service.info('done');
    expect(stub.info).toHaveBeenCalledWith('done', 'Info');
  });
  it('configures duplicate prevention and visible notification placement', () => {
    expect(stub.options.preventDuplicates).toBe(true);
    expect(stub.options.positionClass).toBe('toast-bottom-full-width');
  });
});
