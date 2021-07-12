/*-
 * ============LICENSE_START=======================================================
 *  Copyright (C) 2018 Ericsson. All rights reserved.
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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Optional;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.HashMap;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;
import net.minidev.json.JSONObject;
import org.glassfish.jersey.media.multipart.FormDataContentDisposition;
import org.glassfish.jersey.media.multipart.FormDataParam;
import org.onap.so.db.catalog.beans.ServiceRecipe;
import org.onap.so.db.catalog.beans.NetworkRecipe;
import org.onap.so.db.catalog.beans.VnfRecipe;
import org.onap.so.db.catalog.beans.NetworkResource;
import org.onap.so.db.catalog.beans.VnfResource;
import org.onap.so.monitoring.db.service.DatabaseServiceProvider;
import org.onap.so.monitoring.model.ActivityInstanceDetail;
import org.onap.so.monitoring.model.ProcessDefinitionDetail;
import org.onap.so.monitoring.model.ProcessInstanceDetail;
import org.onap.so.monitoring.model.ProcessInstanceIdDetail;
import org.onap.so.monitoring.model.ProcessInstanceVariableDetail;
import org.onap.so.monitoring.model.SoInfraRequest;
import org.onap.so.monitoring.rest.service.CamundaProcessDataServiceProvider;
import org.onap.so.rest.catalog.beans.Service;
import org.onap.so.rest.exceptions.InvalidRestRequestException;
import org.onap.so.rest.exceptions.HttpResouceNotFoundException;
import org.onap.so.rest.exceptions.RestProcessingException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import org.onap.so.db.catalog.client.CatalogDbClient;

/**
 * @author waqas.ikram@ericsson.com
 */
@Component
@Path("/")
public class SoMonitoringController {

    private static final String INVALID_PROCESS_INSTANCE_ERROR_MESSAGE = "Invalid process instance id: ";

    private static final Logger LOGGER = LoggerFactory.getLogger(SoMonitoringController.class);

    private final DatabaseServiceProvider databaseServiceProvider;

    private final CamundaProcessDataServiceProvider camundaProcessDataServiceProvider;

    private static final String SERVICE = "SERVICE";
    private static final String NETWORK = "NETWORK";
    private static final String VNF = "VNF";

    @Autowired
    private CatalogDbClient catalogDbClient;

    @Autowired
    RestTemplate restTemplate;

    @Value("${bpmn.url}")
    private String bpmnBaseUrl;

    @Autowired
    public SoMonitoringController(final DatabaseServiceProvider databaseServiceProvider,
            final CamundaProcessDataServiceProvider camundaProcessDataServiceProvider) {
        this.databaseServiceProvider = databaseServiceProvider;
        this.camundaProcessDataServiceProvider = camundaProcessDataServiceProvider;
    }

    @GET
    @Path("/process-instance-id/{requestId}")
    @Produces({MediaType.APPLICATION_JSON, MediaType.APPLICATION_XML})
    public Response getProcessInstanceId(final @PathParam("requestId") String requestId) {
        if (requestId == null || requestId.isEmpty()) {
            return Response.status(Status.BAD_REQUEST).entity("Invalid Request id: " + requestId).build();
        }
        try {
            final Optional<ProcessInstanceIdDetail> processInstanceId =
                    camundaProcessDataServiceProvider.getProcessInstanceIdDetail(requestId);
            if (processInstanceId.isPresent()) {
                return Response.status(Status.OK).entity(processInstanceId.get()).build();
            }

            LOGGER.error("Unable to find process instance id for : {} ", requestId);
            return Response.status(Status.NO_CONTENT).build();

        } catch (final InvalidRestRequestException | HttpResouceNotFoundException extensions) {
            final String message = "Unable to find process instance id for : " + requestId;
            LOGGER.error(message);
            return Response.status(Status.BAD_REQUEST).entity(message).build();
        } catch (final RestProcessingException restProcessingException) {
            final String message = "Unable to process request for id: " + requestId;
            LOGGER.error(message);
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(message).build();
        }
    }

    @GET
    @Path("/process-instance/{processInstanceId}")
    @Produces({MediaType.APPLICATION_JSON, MediaType.APPLICATION_XML})
    public Response getSingleProcessInstance(final @PathParam("processInstanceId") String processInstanceId) {
        if (processInstanceId == null || processInstanceId.isEmpty()) {
            return Response.status(Status.BAD_REQUEST)
                    .entity(INVALID_PROCESS_INSTANCE_ERROR_MESSAGE + processInstanceId).build();
        }
        try {
            final Optional<ProcessInstanceDetail> processInstanceDetail =
                    camundaProcessDataServiceProvider.getSingleProcessInstanceDetail(processInstanceId);
            if (processInstanceDetail.isPresent()) {
                return Response.status(Status.OK).entity(processInstanceDetail.get()).build();
            }

            LOGGER.error("Unable to find process instance id for : {}", processInstanceId);
            return Response.status(Status.NO_CONTENT).build();

        } catch (final InvalidRestRequestException | HttpResouceNotFoundException extensions) {
            final String message = "Unable to find process instance id for : " + processInstanceId;
            LOGGER.error(message);
            return Response.status(Status.BAD_REQUEST).entity(message).build();
        } catch (final RestProcessingException restProcessingException) {
            final String message = "Unable to process request for id: " + processInstanceId;
            LOGGER.error(message);
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(message).build();
        }
    }

    @GET
    @Path("/process-definition/{processDefinitionId}")
    @Produces({MediaType.APPLICATION_JSON, MediaType.APPLICATION_XML})
    public Response getProcessDefinitionXml(final @PathParam("processDefinitionId") String processDefinitionId) {
        if (processDefinitionId == null || processDefinitionId.isEmpty()) {
            return Response.status(Status.BAD_REQUEST).entity("Invalid process definition id: " + processDefinitionId)
                    .build();
        }
        try {
            final Optional<ProcessDefinitionDetail> response =
                    camundaProcessDataServiceProvider.getProcessDefinition(processDefinitionId);
            if (response.isPresent()) {
                final ProcessDefinitionDetail definitionDetail = response.get();
                return Response.status(Status.OK).entity(definitionDetail).build();
            }
            LOGGER.error("Unable to find process definition xml for processDefinitionId: {}", processDefinitionId);
            return Response.status(Status.NO_CONTENT).build();

        } catch (final InvalidRestRequestException | HttpResouceNotFoundException extensions) {
            final String message =
                    "Unable to find process definition xml for processDefinitionId: {}" + processDefinitionId;
            return Response.status(Status.BAD_REQUEST).entity(message).build();
        } catch (final RestProcessingException restProcessingException) {
            final String message = "Unable to get process definition xml for id: " + processDefinitionId;
            LOGGER.error(message);
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(message).build();
        }
    }

    @GET
    @Path("/activity-instance/{processInstanceId}")
    @Produces({MediaType.APPLICATION_JSON, MediaType.APPLICATION_XML})
    public Response getActivityInstanceDetail(final @PathParam("processInstanceId") String processInstanceId) {
        if (processInstanceId == null || processInstanceId.isEmpty()) {
            return Response.status(Status.BAD_REQUEST)
                    .entity(INVALID_PROCESS_INSTANCE_ERROR_MESSAGE + processInstanceId).build();
        }
        try {
            final List<ActivityInstanceDetail> activityInstanceDetails =
                    camundaProcessDataServiceProvider.getActivityInstance(processInstanceId);
            return Response.status(Status.OK).entity(activityInstanceDetails).build();
        } catch (final InvalidRestRequestException | HttpResouceNotFoundException extensions) {
            final String message = "Unable to find activity instance for processInstanceId: " + processInstanceId;
            LOGGER.error(message);
            return Response.status(Status.BAD_REQUEST).entity(message).build();
        } catch (final RestProcessingException restProcessingException) {
            final String message = "Unable to get activity instance detail for id: " + processInstanceId;
            LOGGER.error(message);
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(message).build();
        }
    }

    @GET
    @Path("/variable-instance/{processInstanceId}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getProcessInstanceVariables(final @PathParam("processInstanceId") String processInstanceId) {
        if (processInstanceId == null || processInstanceId.isEmpty()) {
            return Response.status(Status.BAD_REQUEST)
                    .entity(INVALID_PROCESS_INSTANCE_ERROR_MESSAGE + processInstanceId).build();
        }
        try {
            final List<ProcessInstanceVariableDetail> processInstanceVariable =
                    camundaProcessDataServiceProvider.getProcessInstanceVariable(processInstanceId);
            return Response.status(Status.OK).entity(processInstanceVariable).build();
        } catch (final InvalidRestRequestException | HttpResouceNotFoundException extensions) {
            final String message =
                    "Unable to find process instance variables for processInstanceId: " + processInstanceId;
            LOGGER.error(message);
            return Response.status(Status.BAD_REQUEST).entity(message).build();
        } catch (final RestProcessingException restProcessingException) {
            final String message = "Unable to get process instance variables for id: " + processInstanceId;
            LOGGER.error(message);
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(message).build();
        }
    }

    @POST
    @Path("/v1/search")
    @Produces({MediaType.APPLICATION_JSON, MediaType.APPLICATION_XML})
    public Response getInfraActiveRequests(final Map<String, String[]> filters,
            @QueryParam("from") final long startTime, @QueryParam("to") final long endTime,
            @QueryParam("maxResult") final Integer maxResult) {

        if (filters == null) {
            return Response.status(Status.BAD_REQUEST).entity("Invalid filters: " + filters).build();
        }
        try {
            final List<SoInfraRequest> requests =
                    databaseServiceProvider.getSoInfraRequest(filters, startTime, endTime, maxResult);
            LOGGER.info("result size: {}", requests.size());
            return Response.status(Status.OK).entity(requests).build();

        } catch (final InvalidRestRequestException | HttpResouceNotFoundException extensions) {
            final String message = "Unable to search request for filters: " + filters + ", from: " + startTime
                    + ", to: " + endTime + ", maxResult: " + maxResult;
            LOGGER.error(message);
            return Response.status(Status.BAD_REQUEST).entity(message).build();
        } catch (final RestProcessingException restProcessingException) {
            final String message = "Unable to search request for filters: " + filters + ", from: " + startTime
                    + ", to: " + endTime + ", maxResult: " + maxResult;
            LOGGER.error(message);
            return Response.status(Status.INTERNAL_SERVER_ERROR).entity(message).build();
        }
    }

    /**
     * upload a workflow package to the server
     * 
     * @param uploadInputStream upload stream
     * @param disposition
     * @return
     */
    @POST
    @Path("/workflowPackages/onboard")
    @Consumes("multipart/form-data")
    @Produces("application/json")
    public Response onboardWorkflowPackage(@FormDataParam("file") InputStream uploadedInputStream,
            @FormDataParam("file") FormDataContentDisposition fileDetail) {
        try {
            LOGGER.info("SoMonitoringController onboardWorkflowPackage inputs {} ,:{}", uploadedInputStream,
                    fileDetail);

            File file = new File(fileDetail.getFileName());
            copyInputStreamToFile(uploadedInputStream, file);

            RestTemplate rest = new RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

            FileSystemResource value = new FileSystemResource(file);
            body.add("file", value);

            org.springframework.http.HttpEntity<MultiValueMap<String, Object>> requestEntity =
                    new org.springframework.http.HttpEntity<>(body, headers);
            LOGGER.info("SoMonitoringController onboardWorkflowPackage  request to be send  :{}", requestEntity);

            ResponseEntity<String> responseEntity =
                    rest.postForEntity(bpmnBaseUrl + "/workflowPackages/onboard", requestEntity, String.class);

            LOGGER.info("SoMonitoringController onboardWorkflowPackage response recieved ::{}", responseEntity);

            return Response.status(200).header("Access-Control-Allow-Origin", "*").entity(responseEntity.getBody())
                    .build();
        } catch (Exception e) {
            LOGGER.info("SoMonitoringController onboardWorkflowPackage error {} ", e.getMessage());
            return Response.status(200).header("Access-Control-Allow-Origin", "*")
                    .entity("{\"errMsg\":\"Unable to process.\"}").build();
        }
    }


    private static void copyInputStreamToFile(InputStream inputStream, File file) throws IOException {

        try (FileOutputStream outputStream = new FileOutputStream(file)) {

            int read;
            byte[] bytes = new byte[1024];

            while ((read = inputStream.read(bytes)) != -1) {
                outputStream.write(bytes, 0, read);

            }

        }

    }

    @POST
    @Path("/serviceRecipes")
    @Produces({MediaType.APPLICATION_JSON})
    public Response setServiceRecipes(final String request) {
        Map<String, String> mapRecipeInfo;
        ObjectMapper mapper = new ObjectMapper();

        try {

            try {
                mapRecipeInfo = mapper.readValue(request, Map.class);

            } catch (Exception e) {
                LOGGER.debug("Mapping of request to JSON object failed : ", e);
                return Response.status(200).header("Access-Control-Allow-Origin", "*").build();
            }

            String type = mapRecipeInfo.get("modelType");
            String modelVersionId = mapRecipeInfo.get("modelVersionId");
            String action = mapRecipeInfo.get("operation");
            String orchestrationFlow = "/mso/async/services/" + mapRecipeInfo.get("orchestrationFlow");
            String modelName = mapRecipeInfo.get("modelName");
            String description = action + " orchestration flow for template " + mapRecipeInfo.get("modelName");

            String[] validTypes = {SERVICE, NETWORK, VNF};

            if (org.springframework.util.StringUtils.isEmpty(type)
                    || !Arrays.asList(validTypes).contains(type.toUpperCase())) {
                return Response.status(200).header("Access-Control-Allow-Origin", "*")
                        .entity("{\"errMsg\":\"type is invalid.\"}").build();

            }
            int assignedId = 0;
            boolean isModelVersionExists = false;
            Object[] conflictAndIdCheck;

            if (type.equalsIgnoreCase(SERVICE)) {
                isModelVersionExists = isServiceModelVersionIdExists(modelVersionId);
                if (!isModelVersionExists) {
                    return Response.status(200).header("Access-Control-Allow-Origin", "*")
                            .entity("{\"errMsg\":\"The service template does not exist.\"}").build();
                }

                conflictAndIdCheck = isServiceActionConflict(modelVersionId, action);
                if ((boolean) conflictAndIdCheck[0]) {
                    return Response.status(200).header("Access-Control-Allow-Origin", "*").entity(
                            "{\"errMsg\":\"The recipe for this action of the service template already exists.\"}")
                            .build();
                }
                assignedId = (int) conflictAndIdCheck[1] + 1;
                ServiceRecipe serviceRecipe = new ServiceRecipe();
                serviceRecipe.setId(assignedId);
                serviceRecipe.setServiceModelUUID(modelVersionId);
                serviceRecipe.setAction(action);
                serviceRecipe.setOrchestrationUri(orchestrationFlow);
                serviceRecipe.setRecipeTimeout(180);
                serviceRecipe.setDescription(description);
                catalogDbClient.postServiceRecipe(serviceRecipe);
            } else if (type.equalsIgnoreCase(NETWORK)) {

                isModelVersionExists = isNetworkVersionIdValid(modelVersionId);
                if (!isModelVersionExists) {
                    return Response.status(200).header("Access-Control-Allow-Origin", "*")
                            .entity("{\"errMsg\":\"The network template does not exist.\"}").build();
                }

                conflictAndIdCheck = isNetworkActionConflict(modelVersionId, action);
                if ((boolean) conflictAndIdCheck[0]) {
                    return Response.status(200).header("Access-Control-Allow-Origin", "*").entity(
                            "{\"errMsg\":\"The recipe for this action of the network template already exists.\"}")
                            .build();
                }

                assignedId = (int) conflictAndIdCheck[1] + 1;
                NetworkRecipe nwrecipe = new NetworkRecipe();
                nwrecipe.setId(assignedId);
                nwrecipe.setModelName(modelName);
                nwrecipe.setAction(action);
                nwrecipe.setOrchestrationUri(orchestrationFlow);
                nwrecipe.setDescription(description);
                nwrecipe.setRecipeTimeout(180);
                nwrecipe.setVersionStr(modelVersionId);
                catalogDbClient.postNetworkRecipe(nwrecipe);

            } else if (type.equalsIgnoreCase(VNF)) {

                isModelVersionExists = isVnfVersionIdValid(modelVersionId);
                if (!isModelVersionExists) {
                    return Response.status(200).header("Access-Control-Allow-Origin", "*")
                            .entity("{\"errMsg\":\"The Vnf template does not exist.\"}").build();

                }

                conflictAndIdCheck = isVfActionConflict(modelVersionId, action);
                if ((boolean) conflictAndIdCheck[0]) {
                    return Response.status(200).header("Access-Control-Allow-Origin", "*")
                            .entity("{\"errMsg\":\"The recipe for this action of the vnf template already exists.\"}")
                            .build();
                }

                assignedId = (int) conflictAndIdCheck[1] + 1;
                VnfRecipe vnfRecipe = new VnfRecipe();
                vnfRecipe.setId(assignedId);
                vnfRecipe.setAction(action);
                vnfRecipe.setDescription(description);
                vnfRecipe.setVersionStr(modelVersionId);
                vnfRecipe.setOrchestrationUri(orchestrationFlow);
                vnfRecipe.setRecipeTimeout(180);
                catalogDbClient.postVnfRecipe(vnfRecipe);

            }

            mapRecipeInfo.put("id", String.valueOf(assignedId));
        } catch (Exception e) {
            LOGGER.debug("WorkflowOnboardingSupport addServiceRecipDese error {} : ", e);
            return Response.status(200).header("Access-Control-Allow-Origin", "*")
                    .entity("{\"errMsg\":\"Unable to process.\"}").build();
        }
        String resp = JSONObject.toJSONString(mapRecipeInfo);
        return Response.status(201).header("Access-Control-Allow-Origin", "*").entity(resp).build();

    }

    private boolean isServiceModelVersionIdExists(String modelVersionId) {
        List<Service> services = catalogDbClient.getServices();
        boolean isExists = false;
        for (Service service : services) {
            if (service.getModelVersionId().equals(modelVersionId)) {
                isExists = true;
                break;
            }
        }
        return isExists;
    }

    private Object[] isServiceActionConflict(String modelVersionId, String action) {
        List<ServiceRecipe> serviceRecipes = catalogDbClient.getServiceRecipes();
        boolean isConflict = false;
        Object[] data = new Object[2];
        int maxId = serviceRecipes.get(0) != null ? serviceRecipes.get(0).getId() : 1;
        for (ServiceRecipe recipe : serviceRecipes) {
            maxId = recipe.getId() > maxId ? recipe.getId() : maxId;
            if (recipe.getServiceModelUUID().equals(modelVersionId)
                    && recipe.getAction().equals(action)) {
                isConflict = true;
            }
        }
        data[0] = isConflict;
        data[1] = maxId;
        return data;
    }

    private Object[] isNetworkActionConflict(String modelVersionId, String action) {
        List<NetworkRecipe> recipes = catalogDbClient.getNetworkRecipes();
        boolean isConflict = false;
        Object[] data = new Object[2];
        int maxId = recipes.get(0) != null ? recipes.get(0).getId() : 1;
        for (NetworkRecipe recipe : recipes) {
            maxId = recipe.getId() > maxId ? recipe.getId() : maxId;
            if (recipe.getVersionStr().equals(modelVersionId)
                    && recipe.getAction().equals(action)) {
                isConflict = true;

            }

        }
        data[0] = isConflict;
        data[1] = maxId;
        return data;
    }

    private Object[] isVfActionConflict(String modelVersionId, String action) {
        List<VnfRecipe> vnfRecipes = catalogDbClient.getVnfRecipes();
        boolean isConflict = false;
        Object[] data = new Object[2];
        int maxId = vnfRecipes.get(0) != null ? vnfRecipes.get(0).getId() : 1;
        for (VnfRecipe recipe : vnfRecipes) {
            maxId = recipe.getId() > maxId ? recipe.getId() : maxId;
            if (recipe.getVersionStr().equals(modelVersionId)
                    && recipe.getAction().equals(action)) {
                isConflict = true;
            }
        }
        data[0] = isConflict;
        data[1] = maxId;
        return data;
    }


    private boolean isNetworkVersionIdValid(String modelVersionId) {
        List<NetworkResource> networkResources = catalogDbClient.getNetworkResources();
        boolean isExists = false;
        for (NetworkResource networkResource : networkResources) {
            if (networkResource.getModelVersion().equals(modelVersionId)) {
                isExists = true;
                break;
            }
        }
        return isExists;
    }

    private boolean isVnfVersionIdValid(String modelVersionId) {
        List<VnfResource> vnfResources = catalogDbClient.getVnfResources();
        boolean isExists = false;
        for (VnfResource vnfResource : vnfResources) {
            if (vnfResource.getModelVersion().equals(modelVersionId)) {
                isExists = true;
                break;
            }
        }
        return isExists;
    }

    @GET
    @Path("/serviceRecipes")
    @Produces({MediaType.APPLICATION_JSON})
    public Response getServiceRecipes() {
        try {
            LOGGER.info(" SoMonitoringController getServiceRecipes request recieved");

            List<ServiceRecipe> serviceRecipes = catalogDbClient.getServiceRecipes();
            Map<String, List<Map<String, String>>> mapNetworkRecipes = new HashMap<String, List<Map<String, String>>>();
            List<Map<String, String>> recipeList = new ArrayList<Map<String, String>>();
            for (ServiceRecipe serviceRecipe : serviceRecipes) {
                Map<String, String> recipeObj = new HashMap<String, String>();
                recipeObj.put("id", String.valueOf(serviceRecipe.getId()));
                recipeObj.put("paramXsd", String.valueOf(serviceRecipe.getParamXsd()));
                recipeObj.put("serviceModelUUID", String.valueOf(serviceRecipe.getServiceModelUUID()));
                recipeObj.put("description", String.valueOf(serviceRecipe.getDescription()));
                recipeObj.put("action", String.valueOf(serviceRecipe.getAction()));
                recipeObj.put("orchestrationUri", String.valueOf(serviceRecipe.getOrchestrationUri()));
                recipeObj.put("recipeTimeout", String.valueOf(serviceRecipe.getRecipeTimeout()));
                recipeObj.put("serviceTimeoutInterim", String.valueOf(serviceRecipe.getServiceTimeoutInterim()));
                recipeObj.put("created", String.valueOf(serviceRecipe.getCreated()));
                recipeList.add(recipeObj);
            }
            mapNetworkRecipes.put("serviceRecipes", recipeList);
            String resp = JSONObject.toJSONString(mapNetworkRecipes);

            return Response.status(200).header("Access-Control-Allow-Origin", "*").entity(resp).build();

        } catch (Exception e) {
            LOGGER.info("SoMonitoringController setServiceRecipes error: {}", e.getMessage());
            return Response.status(200).header("Access-Control-Allow-Origin", "*")
                    .entity("{\"errMsg\":\"Unable to process.\"}").build();
        }
    }

    @GET
    @Path("/networkRecipes")
    @Produces({MediaType.APPLICATION_JSON})
    public Response getNetworkRecipes() {
        try {
            LOGGER.info(" SoMonitoringController getNetworkRecipes request recieved");

            List<NetworkRecipe> networkRecipes = catalogDbClient.getNetworkRecipes();
            Map<String, List<Map<String, String>>> mapNetworkRecipes = new HashMap<String, List<Map<String, String>>>();
            List<Map<String, String>> recipeList = new ArrayList<Map<String, String>>();
            for (NetworkRecipe networkRecipe : networkRecipes) {
                Map<String, String> recipeObj = new HashMap<String, String>();
                recipeObj.put("id", String.valueOf(networkRecipe.getId()));
                recipeObj.put("paramXsd", String.valueOf(networkRecipe.getParamXsd()));
                recipeObj.put("modelName", String.valueOf(networkRecipe.getModelName()));
                recipeObj.put("description", String.valueOf(networkRecipe.getDescription()));
                recipeObj.put("action", String.valueOf(networkRecipe.getAction()));
                recipeObj.put("orchestrationUri", String.valueOf(networkRecipe.getOrchestrationUri()));
                recipeObj.put("recipeTimeout", String.valueOf(networkRecipe.getRecipeTimeout()));
                recipeObj.put("versionStr", String.valueOf(networkRecipe.getVersionStr()));
                recipeObj.put("serviceType", String.valueOf(networkRecipe.getServiceType()));
                recipeObj.put("created", String.valueOf(networkRecipe.getCreated()));
                recipeList.add(recipeObj);
            }
            mapNetworkRecipes.put("networkRecipes", recipeList);
            String resp = JSONObject.toJSONString(mapNetworkRecipes);

            return Response.status(200).header("Access-Control-Allow-Origin", "*").entity(resp).build();

        } catch (Exception e) {
            LOGGER.info("SoMonitoringController getNetworkRecipes error: {}", e.getMessage());
            return Response.status(200).header("Access-Control-Allow-Origin", "*")
                    .entity("{\"errMsg\":\"Unable to process.\"}").build();
        }
    }

    @GET
    @Path("/vnfRecipes")
    @Produces({MediaType.APPLICATION_JSON})
    public Response getVnfRecipes() {
        try {
            LOGGER.info(" SoMonitoringController getVnfRecipes request recieved");

            List<VnfRecipe> vnfRecipes = catalogDbClient.getVnfRecipes();
            Map<String, List<Map<String, String>>> mapVnfRecipes = new HashMap<String, List<Map<String, String>>>();
            List<Map<String, String>> recipeList = new ArrayList<Map<String, String>>();
            for (VnfRecipe vnfRecipe : vnfRecipes) {
                Map<String, String> recipeObj = new HashMap<String, String>();
                recipeObj.put("id", String.valueOf(vnfRecipe.getId()));
                recipeObj.put("nfRole", String.valueOf(vnfRecipe.getNfRole()));
                recipeObj.put("paramXsd", String.valueOf(vnfRecipe.getParamXsd()));
                recipeObj.put("vfModuleId", String.valueOf(vnfRecipe.getVfModuleId()));
                recipeObj.put("description", String.valueOf(vnfRecipe.getDescription()));
                recipeObj.put("action", String.valueOf(vnfRecipe.getAction()));
                recipeObj.put("orchestrationUri", String.valueOf(vnfRecipe.getOrchestrationUri()));
                recipeObj.put("recipeTimeout", String.valueOf(vnfRecipe.getRecipeTimeout()));
                recipeObj.put("versionStr", String.valueOf(vnfRecipe.getVersionStr()));
                recipeObj.put("serviceType", String.valueOf(vnfRecipe.getServiceType()));
                recipeObj.put("created", String.valueOf(vnfRecipe.getCreated()));
                recipeList.add(recipeObj);
            }
            mapVnfRecipes.put("vnfRecipes", recipeList);
            String resp = JSONObject.toJSONString(mapVnfRecipes);

            return Response.status(200).header("Access-Control-Allow-Origin", "*").entity(resp).build();

        } catch (Exception e) {
            LOGGER.info("SoMonitoringController getVnfRecipes error: {}", e.getMessage());
            return Response.status(200).header("Access-Control-Allow-Origin", "*")
                    .entity("{\"errMsg\":\"Unable to process.\"}").build();
        }
    }

}
