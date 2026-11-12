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

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RecipeComponent } from './recipe.component';
import { DataService } from '../data.service';
import { ToastrNotificationService } from '../toastr-notification-service.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { of, throwError } from 'rxjs';
import {
  componentImports,
  notificationStub,
  spinnerStub
} from '../testing/component-test';
['Service', 'Network', 'VNF'].forEach((type) =>
  describe(type + ' recipe form', () => {
    let fixture: ComponentFixture<RecipeComponent>,
      component: RecipeComponent,
      api: any,
      popup: any,
      ref: any,
      parent: any;
    beforeEach(() => {
      api = jasmine.createSpyObj('api', ['saveServiceRecipe']);
      api.saveServiceRecipe.and.returnValue(of({ id: '1' }));
      popup = notificationStub();
      ref = { close: jasmine.createSpy('close') };
      parent = { tab: type + ' Recipe', addNew: true, fData: {} };
      TestBed.configureTestingModule({
        imports: componentImports,
        declarations: [RecipeComponent],
        providers: [
          { provide: DataService, useValue: api },
          { provide: ToastrNotificationService, useValue: popup },
          { provide: NgxSpinnerService, useValue: spinnerStub() },
          { provide: MatDialogRef, useValue: ref },
          { provide: MAT_DIALOG_DATA, useValue: parent }
        ]
      });
      fixture = TestBed.createComponent(RecipeComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });
    function fill() {
      const values = {
        modelName: 'demo',
        nfRole: 'firewall',
        recipeTimeout: '60',
        modelVersionId: 'uuid',
        operation: 'create',
        orchestrationFlow: '/flow'
      };
      Array.prototype.forEach.call(
        fixture.nativeElement.querySelectorAll('input'),
        (input) => {
          input.value = values[input.getAttribute('formControlName')];
          input.dispatchEvent(new Event('input'));
        }
      );
      fixture.detectChanges();
    }
    function submit() {
      fixture.nativeElement.querySelector('button[type="submit"]').click();
      fixture.detectChanges();
    }
    it('rejects an empty required form', () => {
      submit();
      expect(api.saveServiceRecipe).not.toHaveBeenCalled();
      expect(popup.error).toHaveBeenCalledWith('Please fill valid data.');
    });
    it('submits the mode-specific JSON payload once', () => {
      fill();
      submit();
      const body = api.saveServiceRecipe.calls.mostRecent().args[0];
      expect(body.modelType).toBe(type === 'VNF' ? 'Vnf' : type);
      expect(body.modelVersionId).toBe('uuid');
      expect(body.operation).toBe('create');
      expect(body.orchestrationFlow).toBe('/flow');
      if (type === 'Service') expect(body.recipeTimeout).toBe('60');
      if (type === 'Network') expect(body.modelName).toBe('demo');
      if (type === 'VNF') expect(body.nfRole).toBe('firewall');
      expect(api.saveServiceRecipe.calls.count()).toBe(1);
      expect(popup.info).toHaveBeenCalledWith('Data stored in database.');
      expect(ref.close).toHaveBeenCalled();
    });
    it('cancels without saving even when the form is valid', () => {
      fill();
      fixture.nativeElement.querySelector('button').click();
      expect(api.saveServiceRecipe).not.toHaveBeenCalled();
      expect(ref.close).toHaveBeenCalled();
    });
    it('shows application save errors and closes the dialog', () => {
      api.saveServiceRecipe.and.returnValue(of({ errMsg: 'duplicate' }));
      fill();
      submit();
      expect(popup.error).toHaveBeenCalledWith('duplicate');
      expect(ref.close).toHaveBeenCalled();
    });
    it('shows HTTP save failures and closes the dialog', () => {
      api.saveServiceRecipe.and.returnValue(throwError({ status: 500 }));
      fill();
      submit();
      expect(popup.error.calls.count()).toBe(1);
      expect(popup.error.calls.mostRecent().args[0]).toContain('recipe');
      expect(popup.error.calls.mostRecent().args[0]).toContain('500');
      expect(ref.close).toHaveBeenCalled();
    });
    it('reports an empty save response once', () => {
      api.saveServiceRecipe.and.returnValue(of(null));
      fill();
      submit();
      expect(popup.info).not.toHaveBeenCalled();
      expect(popup.error.calls.count()).toBe(1);
      expect(popup.error.calls.mostRecent().args[0]).toContain('recipe');
    });
    it('initializes an empty form when edit data is absent', () => {
      parent.addNew = false;
      parent.fData = undefined;
      component.parentData = parent;
      component.createFormControls();
      component.createForm();
      expect(component.myform.value.modelVersionId).toBe('');
      expect(component.myform.value.operation).toBe('');
    });
    it('loads an existing recipe into the edit form', () => {
      parent.addNew = false;
      parent.fData = {
        serviceModelUUID: 'service-version',
        versionStr: 'other-version',
        modelName: 'existing',
        nfRole: 'role',
        action: 'delete',
        orchestrationUri: '/old',
        recipeTimeout: '90'
      };
      component.parentData = parent;
      component.createFormControls();
      component.createForm();
      fixture.detectChanges();
      expect(component.myform.value.modelVersionId).toBe(
        type === 'Service' ? 'service-version' : 'other-version'
      );
      expect(component.myform.value.operation).toBe('delete');
      if (type === 'VNF') expect(component.myform.value.nfRole).toBe('role');
    });
  })
);
