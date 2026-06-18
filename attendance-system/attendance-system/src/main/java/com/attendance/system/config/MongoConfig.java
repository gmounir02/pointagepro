package com.attendance.system.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoAuditing
@EnableMongoRepositories(basePackages = "com.attendance.system.repository")
public class MongoConfig {
    // Configuration MongoDB - URI définie dans application.yml
}
