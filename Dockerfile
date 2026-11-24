# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS extension
WORKDIR /src/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
COPY assets/ /src/assets/
RUN npm run build && npm run check:extension
RUN apt-get update && apt-get install -y --no-install-recommends zip && rm -rf /var/lib/apt/lists/* \
    && cd dist && zip -qr /extension.zip .

FROM eclipse-temurin:21-jdk-jammy AS backend
WORKDIR /src
COPY gradlew settings.gradle ./
COPY gradle/ gradle/
COPY backend/ScrollFact/build.gradle backend/ScrollFact/build.gradle
COPY backend/ScrollFact/src/ backend/ScrollFact/src/
RUN sh ./gradlew --no-daemon :backend:bootJar && cp backend/ScrollFact/build/libs/*.jar /server.jar

FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends nginx curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 scrollfact && useradd --uid 10001 --gid 10001 --no-create-home scrollfact \
    && mkdir -p /app/data /app/secrets /app/public \
    && chown -R 10001:10001 /app && chmod 700 /app/secrets
WORKDIR /app
COPY --from=backend /server.jar /app/server.jar
COPY --from=extension /extension.zip /app/public/extension.zip
COPY docker/index.html /app/public/index.html
COPY docker/nginx.conf docker/start.sh /app/
RUN ln -sf /dev/stderr /var/log/nginx/error.log
USER 10001:10001
ENV SCROLLFACT_BIND_ADDRESS=127.0.0.1 PORT=8081 \
    SCROLLFACT_DB_URL=jdbc:sqlite:/app/data/scrollfact.db \
    SCROLLFACT_LOG_FILE=/app/data/logs/scrollfact.log \
    SCROLLFACT_MASTER_KEY_FILE=/app/secrets/master.key
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=3s --start-period=60s --retries=12 \
    CMD curl -fsS http://127.0.0.1:8080/v1/reader/status > /dev/null || exit 1
ENTRYPOINT ["sh", "/app/start.sh"]
