package com.attendance.system.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class JustificationRequest {

    @NotBlank(message = "Le motif est obligatoire")
    private String motif;

    private String fichierBase64;
}
