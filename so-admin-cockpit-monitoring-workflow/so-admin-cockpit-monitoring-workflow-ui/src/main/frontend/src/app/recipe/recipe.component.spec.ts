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
import { RecipeDialogData } from '../model/recipe-dialog.model';
import { RecipeSaveResponse } from '../model/api-response.model';
import { serviceRecipe, networkRecipe, vnfRecipe } from '../testing/api-fixtures';
import { RecipeComponent } from './recipe.component';
import { DataService } from '../data.service';
import { ToastrNotificationService } from '../toastr-notification-service.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import {
  componentImports,
  notificationStub,
  spinnerStub
} from '../testing/component-test';
(['Service', 'Network', 'VNF'] as Array<'Service' | 'Network' | 'VNF'>).forEach((type) =>
  describe(type + ' recipe form', () => {
    let fixture: ComponentFixture<RecipeComponent>,
      component: RecipeComponent,
      api: jasmine.SpyObj<Pick<DataService, 'saveServiceRecipe'>>,
      popup: jasmine.SpyObj<Pick<ToastrNotificationService, 'error' | 'info'>>,
      ref: { close: jasmine.Spy },
      parent: RecipeDialogData;
    beforeEach(() => {
      api = jasmine.createSpyObj<Pick<DataService, 'saveServiceRecipe'>>('api', ['saveServiceRecipe']);
      api.saveServiceRecipe.and.returnValue(of({ id: '1' }));
      popup = notificationStub();
      ref = { close: jasmine.createSpy('close') };
      parent = type === 'Service' ? { tab: 'Service Recipe', addNew: true } :
        type === 'Network' ? { tab: 'Network Recipe', addNew: true } : { tab: 'VNF Recipe', addNew: true };
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
      const values: { [name: string]: string } = {
        modelName: 'demo',
        nfRole: 'firewall',
        recipeTimeout: '60',
        modelVersionId: 'uuid',
        operation: 'create',
        orchestrationFlow: '/flow'
      };
      Array.prototype.forEach.call(
        fixture.nativeElement.querySelectorAll('input'),
        (input: HTMLInputElement) => {
          input.value = values[input.getAttribute('formControlName') || ''];
          input.dispatchEvent(new Event('input'));
        }
      );
      fixture.detectChanges();
    }
    function prefill(uri: string) {
      parent.addNew = false;
      const original = type === 'Service' ? serviceRecipe : type === 'Network' ? networkRecipe : vnfRecipe;
      parent.fData = Object.assign({}, original, {
        serviceModelUUID: 'service-version',
        versionStr: 'other-version',
        modelName: 'existing',
        nfRole: 'role',
        action: 'delete',
        orchestrationUri: uri,
        recipeTimeout: '90'
      });
      component.parentData = parent;
      component.createFormControls();
      component.createForm();
      fixture.detectChanges();
    }
    function submit() {
      fixture.nativeElement.querySelector('button[type="submit"]').click();
      fixture.detectChanges();
    }
    it('labels every recipe input and describes required errors after submit', () => {
      submit();
      Array.prototype.forEach.call(fixture.nativeElement.querySelectorAll('input'), (input: HTMLInputElement) => {
        const label = fixture.nativeElement.querySelector('label[for="' + input.id + '"]');
        expect(label).not.toBeNull();
        expect(label.control).toBe(input);
        if (input.required) {
          expect(input.getAttribute('aria-invalid')).toBe('true');
          const error = fixture.nativeElement.querySelector('#' + input.getAttribute('aria-describedby'));
          expect(error).not.toBeNull();
          if (error) { expect(error.textContent).toContain('required'); }
        }
      });
      expect(fixture.nativeElement.querySelector('[aria-live="polite"]')).not.toBeNull();
    });
    it('omits hidden required errors from valid field descriptions', () => {
      fill();
      Array.prototype.forEach.call(fixture.nativeElement.querySelectorAll('input[required]'), (input: HTMLInputElement) => {
        expect(input.getAttribute('aria-describedby')).toBeNull();
      });
      const timeout = fixture.nativeElement.querySelector('#recipe-recipeTimeout');
      if (timeout) { expect(timeout.getAttribute('aria-describedby')).toBe('recipe-timeout-help'); }
    });
    it('describes a touched invalid field only while its error is visible', () => {
      component.modelVersionId.markAsTouched();
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('#recipe-modelVersionId');
      expect(input.getAttribute('aria-describedby')).toBe('recipe-modelVersionId-error');
      expect(fixture.nativeElement.querySelector('#recipe-modelVersionId-error').style.visibility).toBe('visible');
      component.modelVersionId.setValue('valid-id');
      fixture.detectChanges();
      expect(input.getAttribute('aria-describedby')).toBeNull();
      expect(fixture.nativeElement.querySelector('#recipe-modelVersionId-error').style.visibility).toBe('hidden');
    });
    it('rejects an empty required form', () => {
      submit();
      expect(api.saveServiceRecipe).not.toHaveBeenCalled();
      expect(popup.error).toHaveBeenCalledWith('Please fill valid data.');
      ['modelVersionId', 'operation', 'orchestrationFlow'].forEach(name => {
        expect(component.myform.controls[name].hasError('required')).toBe(true);
        expect(component.myform.controls[name].touched).toBe(true);
      });
      if (type === 'Network') {
        expect(component.modelName.hasError('required')).toBe(true);
        expect(component.modelName.touched).toBe(true);
      }
    });
    it('submits the mode-specific JSON payload once', () => {
      fill();
      submit();
      const body = api.saveServiceRecipe.calls.mostRecent().args[0];
      expect(body.modelType).toBe(type === 'VNF' ? 'Vnf' : type);
      expect(body.modelVersionId).toBe('uuid');
      expect(body.operation).toBe('create');
      expect(body.orchestrationFlow).toBe('/flow');
      if (type === 'Service') { expect(body.recipeTimeout).toBe('60'); }
      if (type === 'Network') { expect(body.modelName).toBe('demo'); }
      if (type === 'VNF') { expect(body.nfRole).toBe('firewall'); }
      expect(api.saveServiceRecipe.calls.count()).toBe(1);
      expect(popup.info).toHaveBeenCalledWith('Data stored in database.');
      expect(ref.close).toHaveBeenCalledWith({ saved: true });
      expect(component.myform.value.modelVersionId).toBe(null);
    });
    it('cancels without saving even when the form is valid', () => {
      fill();
      fixture.nativeElement.querySelector('button').click();
      expect(api.saveServiceRecipe).not.toHaveBeenCalled();
      expect(ref.close).toHaveBeenCalledWith({ saved: false });
      component.onSubmit();
      expect(api.saveServiceRecipe).not.toHaveBeenCalled();
    });
    it('shows application save errors and retains the form for retry', () => {
      api.saveServiceRecipe.and.returnValue(of({ errMsg: 'duplicate' }));
      fill();
      const values = component.myform.value;
      submit();
      expect(popup.error).toHaveBeenCalledWith('duplicate');
      expect(ref.close).not.toHaveBeenCalled();
      expect(component.myform.value).toEqual(values);
      expect(fixture.nativeElement.textContent).toContain('duplicate');
    });
    it('shows HTTP save failures and allows a retry without retyping', () => {
      api.saveServiceRecipe.and.returnValue(throwError(new HttpErrorResponse({ status: 500 })));
      fill();
      const values = component.myform.value;
      submit();
      expect(popup.error.calls.count()).toBe(1);
      expect(popup.error.calls.mostRecent().args[0]).toContain('recipe');
      expect(popup.error.calls.mostRecent().args[0]).toContain('500');
      expect(ref.close).not.toHaveBeenCalled();
      expect(component.myform.value).toEqual(values);
      expect(fixture.nativeElement.textContent).toContain('500');
      api.saveServiceRecipe.and.returnValue(of({ id: 'retry-id' }));
      submit();
      expect(api.saveServiceRecipe.calls.count()).toBe(2);
      expect(api.saveServiceRecipe.calls.mostRecent().args[0].modelVersionId).toBe('uuid');
      expect(ref.close).toHaveBeenCalledWith({ saved: true });
    });
    it('reports an empty save response once', () => {
      api.saveServiceRecipe.and.returnValue(of(null));
      fill();
      submit();
      expect(popup.info).not.toHaveBeenCalled();
      expect(popup.error.calls.count()).toBe(1);
      expect(popup.error.calls.mostRecent().args[0]).toContain('recipe');
      expect(ref.close).not.toHaveBeenCalled();
      expect(component.myform.value.modelVersionId).toBe('uuid');
    });
    it('ignores populated recipe data when adding a recipe', () => {
      parent.fData = Object.assign({}, serviceRecipe, networkRecipe, vnfRecipe, {
        serviceModelUUID: 'existing-service', versionStr: 'existing-version',
        modelName: 'existing', nfRole: 'role', recipeTimeout: '90',
        action: 'delete', orchestrationUri: '/mso/async/services/old'
      });
      component.createFormControls();
      component.createForm();
      fixture.detectChanges();
      expect(component.myform.value).toEqual({
        modelName: '', nfRole: '', recipeTimeout: '', modelVersionId: '',
        operation: '', orchestrationFlow: ''
      });
    });
    it('validates required controls before rendering directives run', () => {
      component.createFormControls();
      component.createForm();
      component.onSubmit();
      expect(api.saveServiceRecipe).not.toHaveBeenCalled();
      expect(component.modelVersionId.hasError('required')).toBe(true);
      expect(component.operation.hasError('required')).toBe(true);
      expect(component.orchestrationFlow.hasError('required')).toBe(true);
    });
    it('keeps fields absent from the server DTO optional', () => {
      fill();
      component.myform.patchValue({ recipeTimeout: '', nfRole: '' });
      fixture.detectChanges();
      submit();
      expect(api.saveServiceRecipe.calls.count()).toBe(1);
      expect(ref.close).toHaveBeenCalledWith({ saved: true });
    });
    it('rejects a nonnumeric timeout without losing input', () => {
      fill();
      component.recipeTimeout.setValue('later');
      component.onSubmit();
      expect(component.recipeTimeout.invalid).toBe(true);
      expect(component.recipeTimeout.touched).toBe(true);
      expect(api.saveServiceRecipe).not.toHaveBeenCalled();
      expect(component.recipeTimeout.value).toBe('later');
    });
    it('guards repeated submissions while the save is pending', () => {
      const pending = new Subject<RecipeSaveResponse | null>();
      api.saveServiceRecipe.and.returnValue(pending);
      fill();
      const values = component.myform.value;
      submit();
      expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
      expect(component.myform.value).toEqual(values);
      component.onSubmit();
      expect(api.saveServiceRecipe.calls.count()).toBe(1);
      expect(ref.close).not.toHaveBeenCalled();
      pending.next({ id: 'saved-id' });
      pending.complete();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
      expect(ref.close).toHaveBeenCalledWith({ saved: true });
    });
    [
      [{}, 'missing ID'], [{ id: '' }, 'empty ID'], [{ id: '   ' }, 'blank ID'],
      [{ id: 'saved-id', errMsg: 'Conflict' }, 'error alongside an ID'],
      [{ id: 'saved-id', errMsg: '' }, 'empty error alongside an ID']
    ].forEach(([body, label]) => {
      it('retains input for ' + label + ' and accepts a subsequent retry', () => {
        api.saveServiceRecipe.and.returnValue(of(body));
        fill();
        const values = component.myform.value;
        submit();
        expect(ref.close).not.toHaveBeenCalled();
        expect(component.myform.value).toEqual(values);
        expect(popup.info).not.toHaveBeenCalled();
        expect(popup.error.calls.count()).toBe(1);
        expect(fixture.nativeElement.textContent).toContain(
          label === 'error alongside an ID' ? 'Conflict' : 'recipe'
        );
        expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
        api.saveServiceRecipe.and.returnValue(of({ id: 'retry-id' }));
        submit();
        expect(api.saveServiceRecipe.calls.count()).toBe(2);
        expect(api.saveServiceRecipe.calls.mostRecent().args[0].modelVersionId).toBe('uuid');
        expect(ref.close).toHaveBeenCalledWith({ saved: true });
        expect(fixture.nativeElement.querySelector('[role="alert"]')).toBe(null);
      });
    });
    [
      ['/mso/async/services/create', 'create'],
      ['/flow/mso/async/services/create', '/flow/mso/async/services/create'],
      ['/mso/async/services//mso/async/services/create', '/mso/async/services/create']
    ].forEach(([input, expected]) => {
      it('strips only one leading server prefix from submitted URI ' + input, () => {
        fill();
        component.orchestrationFlow.setValue(input);
        submit();
        expect(api.saveServiceRecipe.calls.mostRecent().args[0].orchestrationFlow).toBe(expected);
      });
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
    it('preserves one leading prefix in the unchanged prefilled suffix', () => {
      prefill('/mso/async/services//mso/async/services/create');
      expect(component.orchestrationFlow.value).toBe('/mso/async/services/create');
      submit();
      expect(api.saveServiceRecipe.calls.mostRecent().args[0].orchestrationFlow)
        .toBe('/mso/async/services/create');
      expect(ref.close).toHaveBeenCalledWith({ saved: true });
    });
    it('preserves the prefilled suffix through a failed save and retry', () => {
      prefill('/mso/async/services//mso/async/services/create');
      api.saveServiceRecipe.and.returnValue(of({ errMsg: 'Retry the save' }));
      submit();
      expect(api.saveServiceRecipe.calls.mostRecent().args[0].orchestrationFlow)
        .toBe('/mso/async/services/create');
      expect(component.orchestrationFlow.value).toBe('/mso/async/services/create');
      expect(ref.close).not.toHaveBeenCalled();
      api.saveServiceRecipe.and.returnValue(of({ id: 'retry-id' }));
      submit();
      expect(api.saveServiceRecipe.calls.count()).toBe(2);
      expect(api.saveServiceRecipe.calls.mostRecent().args[0].orchestrationFlow)
        .toBe('/mso/async/services/create');
      expect(ref.close).toHaveBeenCalledWith({ saved: true });
    });
    it('normalizes a newly entered full URI after prefilling a recipe', () => {
      prefill('/mso/async/services//mso/async/services/create');
      const input = fixture.nativeElement.querySelector('#recipe-orchestrationFlow');
      input.value = '/mso/async/services/replace';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      submit();
      expect(api.saveServiceRecipe.calls.mostRecent().args[0].orchestrationFlow).toBe('replace');
    });
    it('loads an existing recipe into the edit form', () => {
      prefill('/mso/async/services/old');
      expect(component.myform.value.modelVersionId).toBe(
        type === 'Service' ? 'service-version' : 'other-version'
      );
      expect(component.myform.value.operation).toBe('delete');
      if (type === 'VNF') { expect(component.myform.value.nfRole).toBe('role'); }
      if (type === 'Network') { expect(component.myform.value.modelName).toBe('existing'); }
      expect(component.myform.value.recipeTimeout).toBe('90');
      expect(component.myform.value.orchestrationFlow).toBe('old');
      submit();
      expect(api.saveServiceRecipe.calls.mostRecent().args[0].orchestrationFlow).toBe('old');
    });
  })
);
