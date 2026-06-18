package com.attendance.system.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class JustificationEvaluationRequest {

    @NotBlank(message = "Le statut est obligatoire (APPROUVEE / REJETEE)")
    private String statut;
}
