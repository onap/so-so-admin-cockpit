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

import java.net.SocketTimeoutException;
import java.net.http.HttpTimeoutException;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Map;
import java.util.Set;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import net.minidev.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;

final class CatalogDbErrorResponses {
    private static final Logger LOGGER = LoggerFactory.getLogger(CatalogDbErrorResponses.class);

    private CatalogDbErrorResponses() {}

    static Response from(String operation, Exception failure) {
        int status = 500;
        String code = "INTERNAL_ERROR";
        String message = "Unable to process recipe request.";
        Integer upstreamStatus = null;
        if (failure instanceof RestClientResponseException) {
            upstreamStatus = ((RestClientResponseException) failure).getStatusCode().value();
            status = 502;
            code = "CATALOG_DB_UPSTREAM_ERROR";
            message = "Unable to load recipes from CatalogDB.";
        } else if (failure instanceof ResourceAccessException) {
            if (isTimeout(failure)) {
                status = 504;
                code = "CATALOG_DB_TIMEOUT";
                message = "CatalogDB request timed out.";
            } else {
                status = 503;
                code = "CATALOG_DB_UNAVAILABLE";
                message = "CatalogDB is unavailable.";
            }
        }
        LOGGER.error("operation={} dependency=CatalogDB status={} code={} exception={} upstreamStatus={}",
                operation, status, code, failure.getClass().getSimpleName(), upstreamStatus);
        return Response.status(status).type(MediaType.APPLICATION_JSON)
                .header("Access-Control-Allow-Origin", "*")
                .entity(JSONObject.toJSONString(Map.of("code", code, "errMsg", message))).build();
    }

    private static boolean isTimeout(Throwable failure) {
        Set<Throwable> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        for (Throwable cause = failure; cause != null && seen.add(cause); cause = cause.getCause()) {
            if (cause instanceof SocketTimeoutException || cause instanceof HttpTimeoutException) {
                return true;
            }
        }
        return false;
    }
}
