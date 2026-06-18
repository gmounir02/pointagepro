package com.attendance.system.config;

import com.attendance.system.model.User;
import com.attendance.system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Créer un admin par défaut si aucun utilisateur n'existe
        if (!userRepository.findByEmail("admin@company.ma").isPresent()) {
            User admin = User.builder()
                    .firstName("Super")
                    .lastName("Admin")
                    .email("admin@company.ma")
                    .password(passwordEncoder.encode("Admin@123"))
                    .roles(Set.of(User.Role.ROLE_ADMIN, User.Role.ROLE_EMPLOYE))
                    .active(true)
                    .department("Administration")
                    .poste("Administrateur Système")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            userRepository.save(admin);
            log.info("======================================================");
            log.info("  Admin par défaut créé:");
            log.info("  Email   : admin@company.ma");
            log.info("  Password: Admin@123");
            log.info("  ⚠️  Changez ce mot de passe en production !");
            log.info("======================================================");
        }
    }
}
