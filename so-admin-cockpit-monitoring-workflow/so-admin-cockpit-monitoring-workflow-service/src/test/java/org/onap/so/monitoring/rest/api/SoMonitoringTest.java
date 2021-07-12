/*-
 * ============LICENSE_START=======================================================
 * Copyright 2021 Huawei Technologies Co., Ltd.
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
 * ============LICENSE_END=========================================================
 */
package org.onap.so.monitoring.rest.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.onap.so.db.catalog.beans.*;
import org.onap.so.db.catalog.beans.ServiceRecipe;
import org.onap.so.db.catalog.client.CatalogDbClient;
import org.onap.so.rest.catalog.beans.Service;
import org.onap.so.monitoring.db.service.DatabaseServiceProvider;
import org.onap.so.monitoring.rest.service.CamundaProcessDataServiceProvider;
import org.springframework.beans.factory.annotation.Autowired;

import javax.ws.rs.core.Response;
import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.doReturn;

import static org.onap.so.monitoring.rest.api.Constants.SERVICE_RECIPE_REQUEST_JSON_FILE;
import static org.onap.so.monitoring.rest.api.Constants.SERVICE_RECIPE_RESPONSE_JSON_FILE;
import static org.onap.so.monitoring.rest.api.Constants.SERVICE_RESPONSE_JSON_FILE;
import static org.onap.so.monitoring.rest.api.Constants.SERVICE_MODELVERSIONID_NOT_EXIST;
import static org.onap.so.monitoring.rest.api.Constants.SERVICE_SERVICE_ACTION_CONFLICT;
import static org.onap.so.monitoring.rest.api.Constants.SERVICE_TYPE_NETWORK_REQUEST;
import static org.onap.so.monitoring.rest.api.Constants.SERVICE_TYPE_NETWORK_RESPONSE;
import static org.onap.so.monitoring.rest.api.Constants.SERVICE_TYPE_VNF_REQUEST;
import static org.onap.so.monitoring.rest.api.Constants.SERVICE_TYPE_VNF_RESPONSE;
import static org.onap.so.monitoring.rest.api.Constants.NETWORK_RECIPE_REQUEST_JSON_FILE;
import static org.onap.so.monitoring.rest.api.Constants.VNF_RECIPE_REQUEST_JSON_FILE;
import static org.onap.so.monitoring.rest.api.Constants.EMPTY_RESPONSE_JSON_FILE;
import static org.onap.so.monitoring.rest.api.Constants.EMPTY_STRING;

/**
 * @author md.irshad.sheikh@huawei.com
 */
@RunWith(MockitoJUnitRunner.class)
public class SoMonitoringTest {

    @Autowired
    private DatabaseServiceProvider databaseServiceProvider;

    @Autowired
    private CamundaProcessDataServiceProvider camundaProcessDataServiceProvider;

    @Mock
    private CatalogDbClient catalogDbClient;

    @InjectMocks
    private SoMonitoringController injectSoMoni =
            new SoMonitoringController(databaseServiceProvider, camundaProcessDataServiceProvider);

    @Test
    public void test_getServiceRecipes() throws IOException {

        ObjectMapper mapper = new ObjectMapper();
        ServiceRecipe serviceRecipe = mapper.readValue(new String(Files.readAllBytes(SERVICE_RECIPE_RESPONSE_JSON_FILE)),
                ServiceRecipe.class);
        List<ServiceRecipe> serviceRecipes = new ArrayList<ServiceRecipe>();
        serviceRecipes.add(serviceRecipe);

        doReturn(serviceRecipes).when(catalogDbClient).getServiceRecipes();

        final Response response = injectSoMoni.getServiceRecipes();
        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
    }

    @Test
    public void test_getServiceRecipesWithEmpty() throws IOException {

        doReturn(null).when(catalogDbClient).getServiceRecipes();

        final Response response = injectSoMoni.getServiceRecipes();
        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
    }

    @Test
    public void test_getNetworkRecipes() throws IOException {

        ObjectMapper mapper = new ObjectMapper();
        NetworkRecipe networkRecipe = mapper.readValue(new String(Files.readAllBytes(NETWORK_RECIPE_REQUEST_JSON_FILE)),
                NetworkRecipe.class);
        List<NetworkRecipe> networkRecipes = new ArrayList<NetworkRecipe>();
        networkRecipes.add(networkRecipe);
        doReturn(networkRecipes).when(catalogDbClient).getNetworkRecipes();

        final Response response = injectSoMoni.getNetworkRecipes();
        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
    }

    @Test
    public void test_getNetworkRecipesWithEmpty() throws IOException {

        doReturn(null).when(catalogDbClient).getNetworkRecipes();

        final Response response = injectSoMoni.getNetworkRecipes();
        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
    }

    @Test
    public void test_getVnfRecipes() throws IOException {

        ObjectMapper mapper = new ObjectMapper();
        VnfRecipe vnfRecipe = mapper.readValue(new String(Files.readAllBytes(EMPTY_RESPONSE_JSON_FILE)),
                VnfRecipe.class);
        List<VnfRecipe> vnfRecipes = new ArrayList<VnfRecipe>();
        vnfRecipes.add(vnfRecipe);
        doReturn(vnfRecipes).when(catalogDbClient).getVnfRecipes();

        final Response response = injectSoMoni.getVnfRecipes();
        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
    }

    @Test
    public void test_getVnfRecipesWithEmpty() throws IOException {

        doReturn(null).when(catalogDbClient).getVnfRecipes();

        final Response response = injectSoMoni.getVnfRecipes();
        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
    }

    @Test
    public void test_setServiceRecipes_ServiceActionConflict() throws IOException {

        final String jsonRequestString = new String(Files.readAllBytes(SERVICE_RECIPE_REQUEST_JSON_FILE));

        ObjectMapper mapper = new ObjectMapper();

        ServiceRecipe serviceRecipe = mapper.readValue(new String(Files.readAllBytes(SERVICE_SERVICE_ACTION_CONFLICT)),
                ServiceRecipe.class);
        Service service = mapper.readValue(new String(Files.readAllBytes(SERVICE_RESPONSE_JSON_FILE)), Service.class);

        List<ServiceRecipe> serviceRecipes = new ArrayList<ServiceRecipe>();
        List<Service> services = new ArrayList<Service>();

        serviceRecipes.add(serviceRecipe);
        services.add(service);
        doReturn(services).when(catalogDbClient).getServices();
        doReturn(serviceRecipes).when(catalogDbClient).getServiceRecipes();

        final Response response = injectSoMoni.setServiceRecipes(jsonRequestString);
        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
    }

    @Test
    public void test_setServiceRecipes_EmptyJson() throws IOException {

        final String jsonRequestString = new String(Files.readAllBytes(EMPTY_RESPONSE_JSON_FILE));

        final Response response = injectSoMoni.setServiceRecipes(jsonRequestString);
        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
    }

    @Test
    public void test_setServiceRecipes_EmptyString() throws IOException {

        final String jsonRequestString = new String(EMPTY_STRING);

        final Response response = injectSoMoni.setServiceRecipes(jsonRequestString);
        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
    }

    @Test
    public void test_setServiceRecipes_ServiceModelVersionIdNotExists() throws IOException {

        final String jsonRequestString = new String(Files.readAllBytes(SERVICE_RECIPE_REQUEST_JSON_FILE));

        ObjectMapper mapper = new ObjectMapper();

        Service service = mapper.readValue(new String(Files.readAllBytes(SERVICE_MODELVERSIONID_NOT_EXIST)), Service.class);

        List<Service> services = new ArrayList<Service>();

        services.add(service);
        doReturn(services).when(catalogDbClient).getServices();

        final Response response = injectSoMoni.setServiceRecipes(jsonRequestString);
        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
    }

    @Test
    public void test_setServiceRecipes_Success() throws IOException {

        final String jsonRequestString = new String(Files.readAllBytes(SERVICE_RECIPE_REQUEST_JSON_FILE));

        ObjectMapper mapper = new ObjectMapper();

        ServiceRecipe serviceRecipe = mapper.readValue(new String(Files.readAllBytes(SERVICE_RECIPE_RESPONSE_JSON_FILE)),
                ServiceRecipe.class);
        Service service = mapper.readValue(new String(Files.readAllBytes(SERVICE_RESPONSE_JSON_FILE)), Service.class);

        List<ServiceRecipe> serviceRecipes = new ArrayList<ServiceRecipe>();
        List<Service> services = new ArrayList<Service>();

        serviceRecipes.add(serviceRecipe);
        services.add(service);
        doReturn(services).when(catalogDbClient).getServices();
        doReturn(serviceRecipes).when(catalogDbClient).getServiceRecipes();

        final Response response = injectSoMoni.setServiceRecipes(jsonRequestString);
        assertEquals(Response.Status.CREATED.getStatusCode(), response.getStatus());
    }

    @Test
    public void test_setServiceRecipes_TypeNetwork_Success() throws IOException {
        final String jsonRequestString = new String(Files.readAllBytes(SERVICE_TYPE_NETWORK_REQUEST));

        ObjectMapper mapper = new ObjectMapper();

        NetworkRecipe networkRecipe = mapper.readValue(new String(Files.readAllBytes(NETWORK_RECIPE_REQUEST_JSON_FILE)),
                NetworkRecipe.class);
        List<NetworkRecipe> networkRecipes = new ArrayList<NetworkRecipe>();
        networkRecipes.add(networkRecipe);
        doReturn(networkRecipes).when(catalogDbClient).getNetworkRecipes();

        NetworkResource networkResource = mapper.readValue(new String(Files.readAllBytes(SERVICE_TYPE_NETWORK_RESPONSE)),
                NetworkResource.class);
        List<NetworkResource> networkResources = new ArrayList<NetworkResource>();

        networkResources.add(networkResource);
        doReturn(networkResources).when(catalogDbClient).getNetworkResources();

        final Response response = injectSoMoni.setServiceRecipes(jsonRequestString);
        assertEquals(Response.Status.CREATED.getStatusCode(), response.getStatus());
    }

    @Test
    public void test_setServiceRecipes_TypeVnf_Success() throws IOException {
        final String jsonRequestString = new String(Files.readAllBytes(SERVICE_TYPE_VNF_REQUEST));

        ObjectMapper mapper = new ObjectMapper();

        VnfRecipe vnfRecipe = mapper.readValue(new String(Files.readAllBytes(VNF_RECIPE_REQUEST_JSON_FILE)),
                VnfRecipe.class);
        List<VnfRecipe> vnfRecipes = new ArrayList<VnfRecipe>();
        vnfRecipes.add(vnfRecipe);
        doReturn(vnfRecipes).when(catalogDbClient).getVnfRecipes();

        VnfResource vnfResource = mapper.readValue(new String(Files.readAllBytes(SERVICE_TYPE_VNF_RESPONSE)),
                VnfResource.class);
        List<VnfResource> vnfResources = new ArrayList<VnfResource>();

        vnfResources.add(vnfResource);
        doReturn(vnfResources).when(catalogDbClient).getVnfResources();

        final Response response = injectSoMoni.setServiceRecipes(jsonRequestString);
        assertEquals(Response.Status.CREATED.getStatusCode(), response.getStatus());
    }

}