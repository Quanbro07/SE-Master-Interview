# Stage 1:
FROM maven:4.0.0-rc-5-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2:
FROM eclipse-temurin:21-jre-alpine
ARG JAR_FILE=target/*.jar
WORKDIR /app

# Stage 3:
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]