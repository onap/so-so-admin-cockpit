/*-
 * ============LICENSE_START=======================================================
 *  Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.io.IOException;
import java.net.*;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.stream.Stream;
import javax.net.ssl.SSLException;
import jakarta.ws.rs.core.Response;
import org.json.JSONObject;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.Arguments;
import org.onap.so.db.catalog.client.CatalogDbClient;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.*;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.slf4j.LoggerFactory;

class RecipeErrorContractTest {
    static Stream<Arguments> failures() {
        return Stream.of(
            Arguments.of(new HttpClientErrorException(HttpStatus.UNAUTHORIZED), 502, "CATALOG_DB_UPSTREAM_ERROR", "Unable to load recipes from CatalogDB."),
            Arguments.of(new HttpClientErrorException(HttpStatus.FORBIDDEN), 502, "CATALOG_DB_UPSTREAM_ERROR", "Unable to load recipes from CatalogDB."),
            Arguments.of(new HttpClientErrorException(HttpStatus.NOT_FOUND), 502, "CATALOG_DB_UPSTREAM_ERROR", "Unable to load recipes from CatalogDB."),
            Arguments.of(new HttpServerErrorException(HttpStatus.INTERNAL_SERVER_ERROR), 502, "CATALOG_DB_UPSTREAM_ERROR", "Unable to load recipes from CatalogDB."),
            Arguments.of(new HttpServerErrorException(HttpStatus.SERVICE_UNAVAILABLE), 502, "CATALOG_DB_UPSTREAM_ERROR", "Unable to load recipes from CatalogDB."),
            Arguments.of(new ResourceAccessException("connect", new ConnectException()), 503, "CATALOG_DB_UNAVAILABLE", "CatalogDB is unavailable."),
            Arguments.of(new ResourceAccessException("dns", new UnknownHostException()), 503, "CATALOG_DB_UNAVAILABLE", "CatalogDB is unavailable."),
            Arguments.of(new ResourceAccessException("tls", new SSLException("secret")), 503, "CATALOG_DB_UNAVAILABLE", "CatalogDB is unavailable."),
            Arguments.of(new ResourceAccessException("timeout", new SocketTimeoutException()), 504, "CATALOG_DB_TIMEOUT", "CatalogDB request timed out."),
            Arguments.of(new ResourceAccessException("timeout", new IOException(new HttpTimeoutException("secret"))), 504, "CATALOG_DB_TIMEOUT", "CatalogDB request timed out."),
            Arguments.of(new IllegalStateException("secret"), 500, "INTERNAL_ERROR", "Unable to process recipe request."));
    }

    @ParameterizedTest
    @MethodSource("failures")
    void recipeFailuresHaveTruthfulSafeResponses(Exception failure, int status, String code, String message) {
        for (String kind : new String[]{"Service", "Network", "Vnf"}) {
            CatalogDbClient client = mock(CatalogDbClient.class);
            when(client.getServiceRecipes()).thenThrow(failure);
            when(client.getNetworkRecipes()).thenThrow(failure);
            when(client.getVnfRecipes()).thenThrow(failure);
            SoMonitoringController controller = controller(client);
            Response response = call(controller, kind);
            assertEquals(status, response.getStatus(), kind);
            JSONObject body = new JSONObject(response.getEntity().toString());
            assertEquals(code, body.getString("code"));
            assertEquals(message, body.getString("errMsg"));
            assertEquals(2, body.length());
            assertEquals("application/json", response.getMediaType().toString());
            assertEquals("*", response.getHeaderString("Access-Control-Allow-Origin"));
            assertNull(response.getHeaderString("WWW-Authenticate"));
        }
    }

    @org.junit.jupiter.api.Test
    void emptyListsSucceedButNullListsFail() {
        CatalogDbClient client = mock(CatalogDbClient.class);
        when(client.getServiceRecipes()).thenReturn(Collections.emptyList(), null);
        when(client.getNetworkRecipes()).thenReturn(Collections.emptyList(), null);
        when(client.getVnfRecipes()).thenReturn(Collections.emptyList(), null);
        SoMonitoringController controller = controller(client);
        for (String kind : new String[]{"Service", "Network", "Vnf"}) {
            Response success = call(controller, kind);
            assertEquals(200, success.getStatus());
            JSONObject body = new JSONObject(success.getEntity().toString());
            assertEquals(0, body.getJSONArray(kind.toLowerCase() + "Recipes").length());
            assertFalse(body.has("errMsg"));
            assertEquals(500, call(controller, kind).getStatus());
        }
    }

    @org.junit.jupiter.api.Test
    void diagnosticsDoNotExposeUpstreamExceptionContent() {
        String secret = "sentinel-upstream-secret";
        Logger logger = (Logger) LoggerFactory.getLogger("org.onap.so.monitoring.rest.api");
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            CatalogDbClient client = mock(CatalogDbClient.class);
            when(client.getServiceRecipes()).thenThrow(new HttpClientErrorException(
                HttpStatus.UNAUTHORIZED, secret, secret.getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8));
            Response response = controller(client).getServiceRecipes();
            assertEquals(502, response.getStatus());
            assertFalse(response.getEntity().toString().contains(secret));
            String logs = appender.list.stream().map(ILoggingEvent::getFormattedMessage)
                .collect(java.util.stream.Collectors.joining("\n"));
            assertFalse(logs.contains(secret));
            assertTrue(logs.contains("CatalogDB"));
            assertTrue(logs.contains("getServiceRecipes"));
            assertTrue(logs.contains("502"));
            assertTrue(logs.contains("401"));
            assertTrue(logs.contains("CATALOG_DB_UPSTREAM_ERROR"));
            assertTrue(logs.contains("HttpClientErrorException"));
            assertEquals(1, appender.list.stream().filter(e -> e.getLevel() == ch.qos.logback.classic.Level.ERROR).count());
            assertTrue(appender.list.stream().allMatch(e -> e.getThrowableProxy() == null));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    private SoMonitoringController controller(CatalogDbClient client) {
        SoMonitoringController controller = new SoMonitoringController(null, null);
        ReflectionTestUtils.setField(controller, "catalogDbClient", client);
        return controller;
    }

    private Response call(SoMonitoringController controller, String kind) {
        switch (kind) {
            case "Service": return controller.getServiceRecipes();
            case "Network": return controller.getNetworkRecipes();
            default: return controller.getVnfRecipes();
        }
    }
}
