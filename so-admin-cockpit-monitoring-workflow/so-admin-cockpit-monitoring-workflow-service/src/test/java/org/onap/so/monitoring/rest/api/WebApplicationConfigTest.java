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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
public class WebApplicationConfigTest {

    private static final String GUI_USER_AUTH =
            "Basic " + Base64.getEncoder().encodeToString("test-gui-user:test-password".getBytes(StandardCharsets.UTF_8));

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void detailsDeepLink_isForwardedToSpaRoot() throws Exception {
        mockMvc.perform(get("/details/some-request-id").header(HttpHeaders.AUTHORIZATION, GUI_USER_AUTH))
                .andExpect(forwardedUrl("/"));
    }

    @Test
    public void nestedDetailsDeepLink_isForwardedToSpaRoot() throws Exception {
        mockMvc.perform(get("/details/process-instance/abc/def").header(HttpHeaders.AUTHORIZATION, GUI_USER_AUTH))
                .andExpect(forwardedUrl("/"));
    }

    @Test
    public void detailsDeepLink_withoutCredentials_isUnauthorized() throws Exception {
        mockMvc.perform(get("/details/some-request-id")).andExpect(status().isUnauthorized());
    }
}
