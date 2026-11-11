# Copyright (C) 2026 Deutsche Telekom AG. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
FROM maven:3.9.9-eclipse-temurin-17 AS java
FROM node:22.23.2-bookworm-slim AS node
FROM mcr.microsoft.com/playwright:v1.65.0-noble
COPY --from=java /opt/java/openjdk /opt/java/openjdk
COPY --from=java /usr/share/maven /usr/share/maven
COPY --from=node /usr/local/ /usr/local/
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH=/opt/java/openjdk/bin:/usr/share/maven/bin:/usr/local/bin:$PATH
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
