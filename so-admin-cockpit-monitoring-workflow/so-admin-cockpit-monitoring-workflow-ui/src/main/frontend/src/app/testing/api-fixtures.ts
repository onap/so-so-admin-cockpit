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

import { ServiceRecipe } from '../model/serviceRecipe.model';
import { NetworkRecipe } from '../model/networkRecipe.model';
import { VnfRecipe } from '../model/vnfRecipe.model';

export const process = {
  processInstanceId: 'process-1',
  processDefinitionId: 'definition-1',
  processDefinitionName: 'Provision service',
  superProcessInstanceId: null
};
export const activity = {
  activityId: 'Task_1',
  activityName: 'Deploy',
  activityType: 'callActivity',
  processInstanceId: 'process-1',
  calledProcessInstanceId: 'child-1',
  startTime: '',
  endTime: '',
  durationInMillis: '1'
};
export const request = {
  requestId: 'request-1',
  serviceInstanceId: 'service-1',
  serviceInstanceName: 'Demo service',
  networkId: 'network-1',
  requestStatus: 'COMPLETE',
  serviceType: 'test',
  startTime: '1',
  endTime: '2'
};

export const serviceRecipe: ServiceRecipe = {
  id: '1', serviceModelUUID: 'service-uuid', paramXsd: 'null', action: 'create',
  description: 'create orchestration flow for template demo',
  orchestrationUri: '/mso/async/services/flow', recipeTimeout: '180',
  serviceTimeoutInterim: 'null', created: '2026-11-12 08:00:00.0'
};
export const networkRecipe: NetworkRecipe = {
  id: '2', modelName: 'demo', paramXsd: 'null', action: 'create',
  description: 'create orchestration flow for template demo',
  orchestrationUri: '/mso/async/services/flow', recipeTimeout: '180',
  versionStr: 'network-version', serviceType: 'null', created: '2026-11-12 08:00:00.0'
};
export const vnfRecipe: VnfRecipe = {
  id: '3', nfRole: 'null', paramXsd: 'null', vfModuleId: 'null', action: 'create',
  description: 'create orchestration flow for template demo',
  orchestrationUri: '/mso/async/services/flow', recipeTimeout: '180',
  versionStr: 'vnf-version', serviceType: 'null', created: '2026-11-12 08:00:00.0'
};
