package com.attendance.system.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalTime;

@Data
public class EntrepriseConfigRequest {

    private String nomEntreprise;

    @NotNull(message = "La latitude est obligatoire")
    private Double latitude;

    @NotNull(message = "La longitude est obligatoire")
    private Double longitude;

    @NotNull(message = "Le rayon est obligatoire")
    private Integer rayonMetres;

    private LocalTime heureDebutTravail;

    private LocalTime heureFinTravail;

    private Integer toleranceRetardMinutes;

    private String adresse;

    private String telephone;

    private String email;
}
