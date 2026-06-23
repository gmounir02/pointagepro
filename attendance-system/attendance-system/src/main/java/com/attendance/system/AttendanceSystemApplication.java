package com.attendance.system;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AttendanceSystemApplication {

    public static void main(String[] args) {
        SpringApplication.run(AttendanceSystemApplication.class, args);
    }

    @jakarta.annotation.PostConstruct
    public void init() {
        // Aligner l'heure de l'application sur le fuseau horaire du Maroc (Casablanca)
        java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("Africa/Casablanca"));
    }
}
