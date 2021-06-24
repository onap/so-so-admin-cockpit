
/**
============LICENSE_START=======================================================
 Copyright (C) 2019 Ericsson. All rights reserved.
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

@authors: andrei.barcovschi@ericsson.com, waqas.ikram@ericsson.com
*/

export class Constants {

  public static DISPLAYED_COLUMNS_SERVICE = ['serviceModelUUID', 'paramXsd', 'action', 'description', 'orchestrationUri', 'recipeTimeout', 'serviceTimeoutInterim', 'created', 'operation'];
  public static DISPLAYED_COLUMNS_NETWORK = ['modelName', 'paramXsd', 'action', 'description', 'orchestrationUri', 'recipeTimeout', 'versionStr', 'serviceType', 'created', 'operation'];
  public static DISPLAYED_COLUMNS_VNF = ['nfRole', 'paramXsd', 'vfModuleId', 'action', 'description', 'orchestrationUri', 'recipeTimeout', 'versionStr', 'serviceType', 'created', 'operation'];

  public static DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
}
