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
@Document(collection = "conges")
public class Conge {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String userFullName;

    private LocalDate dateDebut;

    private LocalDate dateFin;

    private TypeConge typeConge;

    private String motif;

    private StatutConge statut;

    private String adminId;

    private String commentaireAdmin;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public enum TypeConge {
        CONGE_PAYE,
        CONGE_SANS_SOLDE,
        MALADIE,
        MATERNITE,
        PATERNITE,
        EXCEPTIONNEL
    }

    public enum StatutConge {
        EN_ATTENTE,
        APPROUVE,
        REFUSE
    }
}
