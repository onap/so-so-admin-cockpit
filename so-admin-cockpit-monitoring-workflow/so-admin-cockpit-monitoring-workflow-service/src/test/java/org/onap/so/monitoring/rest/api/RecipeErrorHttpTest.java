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
import java.util.List;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.onap.so.db.catalog.client.CatalogDbClient;
import org.onap.so.db.catalog.beans.ServiceRecipe;
import org.onap.so.db.catalog.beans.NetworkRecipe;
import org.onap.so.db.catalog.beans.VnfRecipe;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "server.ssl.enabled=false")
class RecipeErrorHttpTest {
    @MockitoBean
    private CatalogDbClient client;

    @Autowired
    private TestRestTemplate http;

    @DynamicPropertySource
    static void credentials(DynamicPropertyRegistry registry) {
        registry.add("spring.security.usercredentials[0].username", () -> "recipe-test");
        String encoded = new BCryptPasswordEncoder().encode("recipe-test-password");
        registry.add("spring.security.usercredentials[0].password", () -> encoded);
        registry.add("spring.security.usercredentials[0].role", () -> "GUI-Client");
    }

    @ParameterizedTest
    @MethodSource("org.onap.so.monitoring.rest.api.RecipeErrorContractTest#failures")
    void errorsAreSerializedThroughJersey(Exception failure, int status, String code, String message) {
        when(client.getServiceRecipes()).thenThrow(failure);
        when(client.getNetworkRecipes()).thenThrow(failure);
        when(client.getVnfRecipes()).thenThrow(failure);
        for (String kind : new String[]{"service", "network", "vnf"}) {
            ResponseEntity<String> response = get(kind);
            assertEquals(status, response.getStatusCode().value());
            assertTrue(response.getHeaders().getContentType().isCompatibleWith(org.springframework.http.MediaType.APPLICATION_JSON));
            assertEquals("*", response.getHeaders().getFirst("Access-Control-Allow-Origin"));
            assertNull(response.getHeaders().getFirst("WWW-Authenticate"));
            JSONObject body = new JSONObject(response.getBody());
            assertEquals(code, body.getString("code"));
            assertEquals(message, body.getString("errMsg"));
            assertEquals(2, body.length());
        }
    }

    @Test
    void successesKeepRecipeArraysIncludingEmptyLists() {
        when(client.getServiceRecipes()).thenReturn(List.of(), List.of(new ServiceRecipe()));
        when(client.getNetworkRecipes()).thenReturn(List.of(), List.of(new NetworkRecipe()));
        when(client.getVnfRecipes()).thenReturn(List.of(), List.of(new VnfRecipe()));
        for (String kind : new String[]{"service", "network", "vnf"}) {
            for (int expectedSize : new int[]{0, 1}) {
                ResponseEntity<String> response = get(kind);
                assertEquals(200, response.getStatusCode().value());
                JSONObject body = new JSONObject(response.getBody());
                assertEquals(expectedSize, body.getJSONArray(kind + "Recipes").length());
                assertFalse(body.has("errMsg"));
            }
        }
    }

    @Test
    void inboundAuthenticationStillRejectsAnonymousRequests() {
        assertEquals(401, http.getForEntity("/so/monitoring/serviceRecipes", String.class).getStatusCode().value());
        verifyNoInteractions(client);
    }

    private ResponseEntity<String> get(String kind) {
        return http.withBasicAuth("recipe-test", "recipe-test-password")
            .getForEntity("/so/monitoring/" + kind + "Recipes", String.class);
    }
}
