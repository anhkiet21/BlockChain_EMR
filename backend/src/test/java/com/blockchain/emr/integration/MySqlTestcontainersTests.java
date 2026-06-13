package com.blockchain.emr.integration;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class MySqlTestcontainersTests {
    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("emr")
            .withUsername("emr")
            .withPassword("emr_password");

    @DynamicPropertySource
    static void mysqlProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.datasource.driver-class-name", MYSQL::getDriverClassName);
    }

    @Autowired JdbcTemplate jdbc;

    @Test
    void appliesAllMigrationsAndUsesAutoIncrementIds() {
        Integer migrations = jdbc.queryForObject(
                "select count(*) from flyway_schema_history where success = true", Integer.class);
        String extra = jdbc.queryForObject("""
                select extra from information_schema.columns
                where table_schema = database() and table_name = 'access_grant_history' and column_name = 'id'
                """, String.class);

        assertThat(migrations).isEqualTo(9);
        assertThat(extra).containsIgnoringCase("auto_increment");
    }
}
