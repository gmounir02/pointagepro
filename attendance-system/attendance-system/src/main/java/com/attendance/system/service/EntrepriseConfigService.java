package com.attendance.system.service;

import com.attendance.system.dto.request.EntrepriseConfigRequest;
import com.attendance.system.exception.AttendanceException;
import com.attendance.system.model.EntrepriseConfig;
import com.attendance.system.model.User;
import com.attendance.system.repository.EntrepriseConfigRepository;
import com.attendance.system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class EntrepriseConfigService {

    private final EntrepriseConfigRepository configRepository;
    private final UserRepository userRepository;

    public EntrepriseConfig getConfig() {
        return configRepository.findFirstBy()
                .orElseThrow(() -> new AttendanceException(
                        "Configuration entreprise non trouvée. Veuillez la créer d'abord."));
    }

    public EntrepriseConfig sauvegarderConfig(String adminEmail, EntrepriseConfigRequest request) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new AttendanceException("Admin introuvable"));

        EntrepriseConfig config = configRepository.findFirstBy()
                .orElse(EntrepriseConfig.builder().build());

        if (request.getNomEntreprise() != null) config.setNomEntreprise(request.getNomEntreprise());
        if (request.getLatitude() != null) config.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) config.setLongitude(request.getLongitude());
        if (request.getRayonMetres() != null) config.setRayonMetres(request.getRayonMetres());
        if (request.getAdresse() != null) config.setAdresse(request.getAdresse());
        if (request.getTelephone() != null) config.setTelephone(request.getTelephone());
        if (request.getEmail() != null) config.setEmail(request.getEmail());
        if (request.getToleranceRetardMinutes() != null)
            config.setToleranceRetardMinutes(request.getToleranceRetardMinutes());

        // Horaires de travail
        if (request.getHeureDebutTravail() != null)
            config.setHeureDebutTravail(request.getHeureDebutTravail());
        else if (config.getHeureDebutTravail() == null)
            config.setHeureDebutTravail(LocalTime.of(8, 30));

        if (request.getHeureFinTravail() != null)
            config.setHeureFinTravail(request.getHeureFinTravail());
        else if (config.getHeureFinTravail() == null)
            config.setHeureFinTravail(LocalTime.of(17, 30));

        config.setUpdatedAt(LocalDateTime.now());
        config.setUpdatedByAdminId(admin.getId());

        configRepository.save(config);
        log.info("Configuration entreprise mise à jour par: {}", admin.getEmail());
        return config;
    }
}
