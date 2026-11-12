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

import { TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { ApplicationRef } from '@angular/core';
import { AppModule } from './app.module';
import { RecipeComponent } from './recipe/recipe.component';
import { MatDialog } from '@angular/material';
import { OverlayContainer } from '@angular/cdk/overlay';
import { BrowserAnimationsModule, NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';


describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      declarations: [
        AppComponent,
        SidebarComponent,
        TopbarComponent
      ],
    }).compileComponents();
  }));

  // Ensure creation of SO Monitoring application
  it('application should be created', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));


  // Ensure application title is "SO Monitor"
  it(`should have title 'SO Monitor'`, async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toEqual('SO Monitor');
  }));
});

describe('Application recipe dialog', () => {
  let dialog: MatDialog;
  let overlay: OverlayContainer;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [AppModule, RouterTestingModule, HttpClientTestingModule]
    }).overrideModule(AppModule, {
      remove: { imports: [BrowserAnimationsModule] },
      add: { imports: [NoopAnimationsModule] }
    }).compileComponents();
  }));

  afterEach(() => {
    if (dialog) { dialog.closeAll(); }
    if (overlay) { overlay.ngOnDestroy(); }
  });

  it('opens the recipe form with its accessible dialog title', async () => {
    dialog = TestBed.get(MatDialog);
    overlay = TestBed.get(OverlayContainer);
    const ref = dialog.open(RecipeComponent, {
      data: { tab: 'Service Recipe', addNew: true, fData: {} }
    });
    TestBed.get(ApplicationRef).tick();
    await Promise.resolve();
    TestBed.get(ApplicationRef).tick();
    const container = overlay.getContainerElement();
    const dialogElement = container.querySelector('[role="dialog"]');
    const title = container.querySelector('h1');
    expect(dialogElement).not.toBeNull();
    expect(title.id).not.toBe('');
    expect(dialogElement.getAttribute('aria-labelledby')).toBe(title.id);
    expect(container.textContent).toContain('Add Recipe');
    expect(container.querySelector('input[formControlName="modelVersionId"]')).not.toBeNull();
    ref.close();
    await Promise.resolve();
  });
});
