package com.attendance.system.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "pointages")
public class Pointage {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String userFullName;

    private LocalDate date;

    private LocalDateTime heureEntree;

    private LocalDateTime heureSortie;

    private Double latitudeEntree;

    private Double longitudeEntree;

    private Double latitudeSortie;

    private Double longitudeSortie;

    private String qrCodeId;

    private boolean enRetard;

    private boolean sortieAnticipee;

    private boolean heuresInsuffisantes;

    private Long dureeMinutes; // calculé à la sortie

    private TypePointage type;

    private String note;

    private String photoEntree; // Photo de pointage à l'entrée (Base64)

    private String photoSortie; // Photo de pointage à la sortie (Base64)

    private String justificationMotif;

    private String justificatifFichier; // Contenu Base64

    private String statutJustification; // "NON_JUSTIFIE", "EN_ATTENTE", "APPROUVEE", "REJETEE"

    public enum TypePointage {
        ENTREE,
        SORTIE
    }
}
