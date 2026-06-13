FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q dependency:go-offline
COPY src src
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:17-jre-jammy
RUN useradd --system --uid 10001 --create-home emr
WORKDIR /app
COPY --from=build /workspace/target/emr-0.0.1-SNAPSHOT.jar app.jar
RUN mkdir -p /app/logs && chown -R emr:emr /app
USER emr
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
