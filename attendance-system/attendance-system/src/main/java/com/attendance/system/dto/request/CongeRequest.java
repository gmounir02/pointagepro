package com.attendance.system.dto.request;

import com.attendance.system.model.Conge;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CongeRequest {

    @NotNull(message = "La date de début est obligatoire")
    private LocalDate dateDebut;

    @NotNull(message = "La date de fin est obligatoire")
    @Future(message = "La date de fin doit être dans le futur")
    private LocalDate dateFin;

    @NotNull(message = "Le type de congé est obligatoire")
    private Conge.TypeConge typeConge;

    @NotBlank(message = "Le motif est obligatoire")
    private String motif;
}
