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

import { HttpErrorResponse } from '@angular/common/http';
import { HttpErrorHandlerService } from './http-error-handler.service';
describe('HTTP error propagation', () => {
  [0, 400, 404, 500].forEach((status) =>
    it('preserves the original HTTP ' + status + ' response without notifying', () => {
      const handler = new HttpErrorHandlerService();
      const error = new HttpErrorResponse({ status, url: '/example', error: { errMsg: 'failure' } });
      handler.handleError('POST', '/example')(error).subscribe(
        () => fail('expected error'),
        (received) => expect(received).toBe(error)
      );
    })
  );
});
