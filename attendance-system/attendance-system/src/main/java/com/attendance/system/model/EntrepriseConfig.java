package com.attendance.system.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "entreprise_config")
public class EntrepriseConfig {

    @Id
    private String id;

    private String nomEntreprise;

    private Double latitude;

    private Double longitude;

    private Integer rayonMetres;      // rayon GPS autorisé (ex: 100m)

    private LocalTime heureDebutTravail;  // ex: 08:30

    private LocalTime heureFinTravail;    // ex: 17:30

    private Integer toleranceRetardMinutes;  // ex: 10 minutes de tolérance

    private String adresse;

    private String telephone;

    private String email;

    private LocalDateTime updatedAt;

    private String updatedByAdminId;
}
