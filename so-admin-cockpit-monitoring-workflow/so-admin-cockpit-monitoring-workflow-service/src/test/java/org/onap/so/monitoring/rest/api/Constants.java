/*-
 * ============LICENSE_START=======================================================
 *  Copyright (C) 2019 Ericsson. All rights reserved.
 * ================================================================================
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 * SPDX-License-Identifier: Apache-2.0
 * ============LICENSE_END=========================================================
 */
package org.onap.so.monitoring.rest.api;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * @author andrei.barcovschi@ericsson.com
 *
 */
public class Constants {

    public static final String PROCRESS_DEF_ID = "AFRFLOW:1:c6eea1b7-9722-11e8-8caf-022ac9304eeb";

    public static final String EMPTY_ARRAY_RESPONSE = "[]";

    public static final String PROCESS_INSTACE_ID = "5956a99d-9736-11e8-8caf-022ac9304eeb";

    public static final String EMPTY_STRING = "";

    public static final String SOURCE_TEST_FOLDER = "src/test/resources/camundaResponses/";

    public static final String SOURCE_CATALOG_FOLDER = "src/test/resources/catalogResponses/";

    public static final Path PROCESS_DEF_RESPONSE_JSON_FILE = Paths.get(SOURCE_TEST_FOLDER + "processDefinition.json");

    public static final Path ACTIVITY_INSTANCE_RESPONSE_JSON_FILE =
            Paths.get(SOURCE_TEST_FOLDER + "activityInstance.json");

    public static final Path PROCESS_INSTANCE_VARIABLES_RESPONSE_JSON_FILE =
            Paths.get(SOURCE_TEST_FOLDER + "processInstanceVariables.json");

    public static final Path PROCCESS_INSTANCE_RESPONSE_JSON_FILE =
            Paths.get(SOURCE_TEST_FOLDER + "processInstance.json");

    public static final Path SINGLE_PROCCESS_INSTANCE_RESPONSE_JSON_FILE =
            Paths.get(SOURCE_TEST_FOLDER + "singleprocessInstance.json");

    public static final Path SEARCH_RESULT_RESPONSE_JSON_FILE =
            Paths.get("src/test/resources/databaseResponses/searchResult.json");

    public static final Path SERVICE_RECIPE_RESPONSE_JSON_FILE =
            Paths.get(SOURCE_CATALOG_FOLDER + "serviceRecipeResponse.json");

    public static final Path SERVICE_RECIPE_REQUEST_JSON_FILE =
            Paths.get(SOURCE_CATALOG_FOLDER + "serviceRecipeRequest.json");

    public static final Path NETWORK_RECIPE_RESPONSE_JSON_FILE =
            Paths.get(SOURCE_CATALOG_FOLDER + "networkRecipeResponse.json");

    public static final Path SERVICE_RESPONSE_JSON_FILE =
            Paths.get(SOURCE_CATALOG_FOLDER + "serviceResponse.json");

    public static final Path SERVICE_MODELVERSIONID_NOT_EXIST =
            Paths.get(SOURCE_CATALOG_FOLDER + "service_Model_Version_Not_Exist.json");

    public static final Path SERVICE_SERVICE_ACTION_CONFLICT =
            Paths.get(SOURCE_CATALOG_FOLDER + "service_ServiceActionConflict.json");

    public static final Path SERVICE_TYPE_NETWORK_REQUEST =
            Paths.get(SOURCE_CATALOG_FOLDER + "serviceRecipeRequest_TypeNetwork.json");

    public static final Path SERVICE_TYPE_NETWORK_RESPONSE =
            Paths.get(SOURCE_CATALOG_FOLDER + "service_Type_Network_Response.json");

    public static final Path SERVICE_TYPE_VNF_REQUEST =
            Paths.get(SOURCE_CATALOG_FOLDER + "serviceRecipeRequest_TypeVnf.json");

    public static final Path VNF_RECIPE_RESPONSE_JSON_FILE =
            Paths.get(SOURCE_CATALOG_FOLDER + "vnfRecipeResponse.json");

    public static final Path SERVICE_TYPE_VNF_RESPONSE =
            Paths.get(SOURCE_CATALOG_FOLDER + "service_Type_Vnf_Response.json");

    public static final Path EMPTY_RESPONSE_JSON_FILE =
            Paths.get(SOURCE_CATALOG_FOLDER + "EmptyResponse.json");

    public static final String ID = UUID.randomUUID().toString();

    public static final long END_TIME_IN_MS = 1546351200000l;

    public static final long START_TIME_IN_MS = 1546346700000l;

    private Constants() {}

}
