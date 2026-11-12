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
import { OnboardComponent } from './onboard.component';
import { DataService } from '../data.service';
import { ToastrNotificationService } from '../toastr-notification-service.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatDialog } from '@angular/material';
import { serviceRecipe, networkRecipe, vnfRecipe } from '../testing/api-fixtures';
import { of, throwError } from 'rxjs';
import {
  componentImports,
  notificationStub,
  spinnerStub
} from '../testing/component-test';
describe('Workflow onboarding', () => {
  let component: OnboardComponent,
    fixture: ComponentFixture<OnboardComponent>,
    api: any,
    popup: any,
    spinner: any,
    dialog: any;
  beforeEach(() => {
    api = jasmine.createSpyObj('api', [
      'getServiceRecipe',
      'getNetworkRecipe',
      'getVnfRecipe',
      'onboardBPMNInfra'
    ]);
    api.getServiceRecipe.and.returnValue(
      of({
        serviceRecipes: [{ serviceModelUUID: 'service-uuid', action: 'create' }]
      })
    );
    api.getNetworkRecipe.and.returnValue(of({ networkRecipes: [] }));
    api.getVnfRecipe.and.returnValue(of({ vnfRecipes: [] }));
    popup = notificationStub();
    spinner = spinnerStub();
    dialog = {
      open: jasmine
        .createSpy('open')
        .and.returnValue({ afterClosed: () => of(null) })
    };
    TestBed.configureTestingModule({
      imports: componentImports,
      declarations: [OnboardComponent],
      providers: [
        { provide: DataService, useValue: api },
        { provide: ToastrNotificationService, useValue: popup },
        { provide: NgxSpinnerService, useValue: spinner },
        { provide: MatDialog, useValue: dialog }
      ]
    });
    fixture = TestBed.createComponent(OnboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  function choose(name?: string) {
    component.beforeUpload({
      currentTarget: { files: name ? [new File(['archive'], name)] : [] }
    });
  }
  it('renders the initial service list', () => {
    expect(fixture.nativeElement.textContent).toContain('service-uuid');
  });
  ['Network Recipe', 'VNF Recipe'].forEach((tab) =>
    it('loads an empty ' + tab + ' list from tab selection', async () => {
      const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');
      tabs[tab === 'Network Recipe' ? 1 : 2].click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(component.currentTab).toBe(tab);
      expect(
        (tab === 'Network Recipe'
          ? component.networkRecipe
          : component.vnfRecipe
        ).data
      ).toEqual([]);
    })
  );
  it('refreshes the active list after saving the recipe dialog', () => {
    dialog.open.and.returnValue({ afterClosed: () => of({ saved: true }) });
    component.currentTab = 'Network Recipe';
    component.addRecipe();
    expect(dialog.open.calls.mostRecent().args[1].data).toEqual({
      tab: 'Network Recipe',
      addNew: true,
    });
    expect(api.getNetworkRecipe).toHaveBeenCalled();
  });
  [undefined, null, { saved: false }].forEach(result => {
    it('retains the selected list after closing without a save: ' + JSON.stringify(result), () => {
      dialog.open.and.returnValue({ afterClosed: () => of(result) });
      component.currentTab = 'Network Recipe';
      component.addRecipe();
      expect(api.getNetworkRecipe).not.toHaveBeenCalled();
      expect(api.getServiceRecipe.calls.count()).toBe(1);
      expect(api.getVnfRecipe).not.toHaveBeenCalled();
    });
  });
  ['Service Recipe', 'Network Recipe', 'VNF Recipe'].forEach((tab: any) => {
    it('reloads only the selected ' + tab + ' after a confirmed save', () => {
      dialog.open.and.returnValue({ afterClosed: () => of({ saved: true }) });
      component.currentTab = tab;
      component.addRecipe();
      expect(api.getServiceRecipe.calls.count()).toBe(tab === 'Service Recipe' ? 2 : 1);
      expect(api.getNetworkRecipe.calls.count()).toBe(tab === 'Network Recipe' ? 1 : 0);
      expect(api.getVnfRecipe.calls.count()).toBe(tab === 'VNF Recipe' ? 1 : 0);
    });
  });
  it('does not upload without a selected file', () => {
    component.onSubmit();
    expect(api.onboardBPMNInfra).not.toHaveBeenCalled();
    expect(popup.error).toHaveBeenCalled();
  });
  it('handles a cancelled file picker', () => {
    choose();
    component.onSubmit();
    expect(component.fileList).toEqual([]);
    expect(api.onboardBPMNInfra).not.toHaveBeenCalled();
  });
  ['workflow.txt', 'workflow.war.exe'].forEach((name) =>
    it('rejects ' + name, () => {
      choose(name);
      component.onSubmit();
      expect(component.fileList).toEqual([]);
      expect(api.onboardBPMNInfra).not.toHaveBeenCalled();
    })
  );
  it('uploads the selected WAR as multipart and shows success', () => {
    choose('workflow.war');
    api.onboardBPMNInfra.and.returnValue(
      of({ result: 'true', message: 'Uploaded' })
    );
    component.onSubmit();
    expect(
      (api.onboardBPMNInfra.calls.mostRecent().args[0].get('file') as File).name
    ).toBe('workflow.war');
    expect(popup.info).toHaveBeenCalledWith('Uploaded');
    expect(spinner.hide).toHaveBeenCalled();
  });
  it('reports application errors and allows a successful retry', () => {
    choose('workflow.war');
    api.onboardBPMNInfra.and.returnValue(of({ errMsg: 'Invalid archive' }));
    component.onSubmit();
    expect(popup.error).toHaveBeenCalledWith('Invalid archive');
    api.onboardBPMNInfra.and.returnValue(
      of({ result: 'true', message: 'Uploaded' })
    );
    component.onSubmit();
    expect(popup.info).toHaveBeenCalledWith('Uploaded');
  });
  it('stops loading on an HTTP failure', () => {
    choose('workflow.war');
    api.onboardBPMNInfra.and.returnValue(throwError({ status: 500 }));
    component.onSubmit();
    expect(popup.error).toHaveBeenCalled();
    expect(spinner.hide).toHaveBeenCalled();
  });
  [
    ['getServiceRecipe', 'service'],
    ['getNetworkRecipe', 'network'],
    ['getVnfRecipe', 'VNF']
  ].forEach(([method, label]) => {
    [{ errMsg: 'Unable to process.' }, null].forEach((body) => {
      it('reports a ' + label + ' list application failure once: ' + JSON.stringify(body), () => {
        api[method].and.returnValue(of(body));
        component[method]();
        expect(popup.error.calls.count()).toBe(1);
        expect(popup.error.calls.mostRecent().args[0]).toContain(body ? 'Unable to process.' : label);
        expect(spinner.hide).toHaveBeenCalled();
      });
    });
    it('reports a ' + label + ' list transport failure once with its status', () => {
      api[method].and.returnValue(throwError({ status: 503 }));
      component[method]();
      expect(popup.error.calls.count()).toBe(1);
      expect(popup.error.calls.mostRecent().args[0]).toContain('503');
      expect(popup.error.calls.mostRecent().args[0]).toContain(label);
    });
  });
  it('reports an empty workflow upload response once', () => {
    choose('workflow.war');
    api.onboardBPMNInfra.and.returnValue(of(null));
    component.onSubmit();
    expect(popup.error.calls.count()).toBe(1);
    expect(popup.error.calls.mostRecent().args[0]).toContain('upload');
    expect(popup.info).not.toHaveBeenCalled();
    expect(spinner.hide).toHaveBeenCalled();
  });
  [
    [{ result: 'true' }, 'Workflow uploaded.', true],
    [{ result: 'false', message: 'Invalid package' }, 'Invalid package', false],
    [{}, 'Unable to upload bpmn file.', false]
  ].forEach(([body, message, success]) => {
    it('reports the upload outcome for ' + JSON.stringify(body), () => {
      choose('workflow.war');
      api.onboardBPMNInfra.and.returnValue(of(body));
      component.onSubmit();
      expect(success ? popup.info : popup.error).toHaveBeenCalledWith(message);
    });
  });
  ['Service Recipe', 'VNF Recipe'].forEach((tab: any) => {
    it('opens a typed empty dialog for ' + tab, () => {
      component.currentTab = tab;
      component.addRecipe();
      expect(dialog.open.calls.mostRecent().args[1].data).toEqual({
        tab, addNew: true
      });
    });
  });
  it('owns its Add button in an Angular toolbar outside the tab headers', () => {
    const add = fixture.nativeElement.querySelector('.recipe-toolbar button');
    expect(add).not.toBeNull();
    if (add) {
      add.click();
      expect(dialog.open.calls.mostRecent().args[1].data).toEqual({ tab: 'Service Recipe', addNew: true });
    }
  });
  it('does not load a tab when keyboard focus alone moves to its header', fakeAsync(() => {
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');
    tabs[0].focus();
    const right = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(right, 'keyCode', { value: 39 });
    tabs[0].dispatchEvent(right);
    tick(); fixture.detectChanges();
    expect(component.currentTab).toBe('Service Recipe');
    expect(api.getServiceRecipe.calls.count()).toBe(1);
    expect(api.getNetworkRecipe).not.toHaveBeenCalled();
    expect(api.getVnfRecipe).not.toHaveBeenCalled();
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(enter, 'keyCode', { value: 13 });
    tabs[1].dispatchEvent(enter);
    fixture.detectChanges(); tick(500); fixture.detectChanges();
    expect(component.currentTab).toBe('Network Recipe');
    expect(api.getNetworkRecipe.calls.count()).toBe(1);
    tabs[1].click(); fixture.detectChanges(); tick(500); fixture.detectChanges();
    expect(api.getNetworkRecipe.calls.count()).toBe(1);
  }));
  [
    { tab: 'Service Recipe', recipe: serviceRecipe, index: 0 },
    { tab: 'Network Recipe', recipe: networkRecipe, index: 1 },
    { tab: 'VNF Recipe', recipe: vnfRecipe, index: 2 }
  ].forEach(testCase => {
    it('opens the selected ' + testCase.tab + ' row for Modify and a blank Add dialog', async () => {
      api.getServiceRecipe.and.returnValue(of({ serviceRecipes: [serviceRecipe] }));
      api.getNetworkRecipe.and.returnValue(of({ networkRecipes: [networkRecipe] }));
      api.getVnfRecipe.and.returnValue(of({ vnfRecipes: [vnfRecipe] }));
      component.getServiceRecipe(); fixture.detectChanges();
      fixture.nativeElement.querySelectorAll('[role="tab"]')[testCase.index].click();
      fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
      await fixture.whenStable(); fixture.detectChanges();
      const modify = Array.prototype.find.call(fixture.nativeElement.querySelectorAll('button'),
        button => button.textContent.trim() === 'Modify');
      modify.click();
      expect(dialog.open.calls.mostRecent().args[1].data).toEqual({
        tab: testCase.tab, addNew: false, fData: testCase.recipe
      });
      const add = fixture.nativeElement.querySelector('.recipe-toolbar button');
      expect(add).not.toBeNull();
      if (add) {
        add.click();
        expect(dialog.open.calls.mostRecent().args[1].data).toEqual({ tab: testCase.tab, addNew: true });
      }
    });
  });
  it('associates the upload label and help with the file control', () => {
    const label = fixture.nativeElement.querySelector('label[for="recipe-war"]');
    const control = fixture.nativeElement.querySelector('#recipe-war');
    expect(label.control).toBe(control);
    expect(control.getAttribute('aria-describedby')).toBe('recipe-war-help');
    expect(fixture.nativeElement.querySelector('#recipe-war-help').textContent).toContain('WAR');
  });

});
