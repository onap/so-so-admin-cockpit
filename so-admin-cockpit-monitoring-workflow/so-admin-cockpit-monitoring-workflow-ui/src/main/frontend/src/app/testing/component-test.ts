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

import { ToastrNotificationService } from '../toastr-notification-service.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  MatTabsModule,
  MatTableModule,
  MatPaginatorModule,
  MatSortModule,
  MatSelectModule,
  MatFormFieldModule,
  MatInputModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatIconModule,
  MatCardModule,
  MatDialogModule
} from '@angular/material';
import { NgxSpinnerService, NgxSpinnerModule } from 'ngx-spinner';
export const componentImports = [
  FormsModule,
  ReactiveFormsModule,
  NoopAnimationsModule,
  RouterTestingModule,
  HttpClientTestingModule,
  MatTabsModule,
  MatTableModule,
  MatPaginatorModule,
  MatSortModule,
  MatSelectModule,
  MatFormFieldModule,
  MatInputModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatIconModule,
  MatCardModule,
  MatDialogModule,
  NgxSpinnerModule
];
export function notificationStub() {
  return jasmine.createSpyObj<Pick<ToastrNotificationService, 'error' | 'info'>>('notifications', ['error', 'info']);
}
export function spinnerStub() {
  const spinner = new NgxSpinnerService();
  return Object.assign(spinner, {
    show: spyOn(spinner, 'show').and.callThrough(),
    hide: spyOn(spinner, 'hide').and.callThrough()
  });
}
