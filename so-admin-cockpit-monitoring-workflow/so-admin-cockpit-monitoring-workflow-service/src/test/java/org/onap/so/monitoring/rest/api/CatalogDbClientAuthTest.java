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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.onap.so.configuration.BasicHttpHeadersProvider.AUTHORIZATION_HEADER;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.onap.so.db.catalog.beans.ServiceRecipe;
import org.onap.so.db.catalog.client.CatalogDbClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import com.sun.net.httpserver.HttpServer;

@ActiveProfiles("test")
@SpringBootTest
public class CatalogDbClientAuthTest {

    private static final String EXPECTED_AUTH =
            "Basic " + Base64.getEncoder().encodeToString("cockpit:cockpit-secret".getBytes(StandardCharsets.UTF_8));

    private static final String EMPTY_SERVICE_RECIPES = "{\"_embedded\":{\"serviceRecipe\":[]}}";

    private static final java.util.concurrent.atomic.AtomicInteger catalogStatus = new java.util.concurrent.atomic.AtomicInteger(200);

    private static final AtomicReference<String> catalogGetAuthorization = new AtomicReference<>();

    private static final HttpServer catalogAdapter = startCatalogAdapter();

    @DynamicPropertySource
    static void catalogEndpoint(final DynamicPropertyRegistry registry) {
        registry.add("mso.catalog.db.spring.endpoint",
                () -> "http://localhost:" + catalogAdapter.getAddress().getPort());
    }

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private CatalogDbClient catalogDbClient;

    private MockRestServiceServer mockServer;

    @BeforeEach
    public void setUp() {
        catalogStatus.set(200);
        mockServer = MockRestServiceServer.bindTo(restTemplate).build();
    }

    @Test
    public void postServiceRecipe_sendsSoAuthCredentials() {
        mockServer.expect(requestTo("http://localhost:" + catalogAdapter.getAddress().getPort() + "/serviceRecipe"))
                .andExpect(method(HttpMethod.POST)).andExpect(header(AUTHORIZATION_HEADER, EXPECTED_AUTH))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

        catalogDbClient.postServiceRecipe(new ServiceRecipe());

        mockServer.verify();
    }

    @Test
    public void getServiceRecipes_sendsSoAuthCredentials() {
        catalogDbClient.getServiceRecipes();

        assertEquals(EXPECTED_AUTH, catalogGetAuthorization.get());
    }

    @Autowired
    private SoMonitoringController controller;

    @Test
    public void catalogUnauthorizedBecomesBadGateway() {
        catalogStatus.set(401);
        jakarta.ws.rs.core.Response response = controller.getServiceRecipes();
        assertEquals(502, response.getStatus());
        assertEquals("CATALOG_DB_UPSTREAM_ERROR",
                new org.json.JSONObject(response.getEntity().toString()).getString("code"));
        assertEquals(EXPECTED_AUTH, catalogGetAuthorization.get());
    }

    @AfterAll
    public static void stopCatalogAdapter() {
        catalogAdapter.stop(0);
    }

    private static HttpServer startCatalogAdapter() {
        try {
            final HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
            server.createContext("/serviceRecipe", exchange -> {
                catalogGetAuthorization.set(exchange.getRequestHeaders().getFirst(AUTHORIZATION_HEADER));
                final byte[] body = EMPTY_SERVICE_RECIPES.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "application/hal+json");
                exchange.sendResponseHeaders(catalogStatus.get(), body.length);
                try (OutputStream out = exchange.getResponseBody()) {
                    out.write(body);
                }
            });
            server.start();
            return server;
        } catch (final IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
