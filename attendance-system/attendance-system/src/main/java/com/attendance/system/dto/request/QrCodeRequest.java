package com.attendance.system.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QrCodeRequest {

    private String description;

    @NotNull(message = "La durée de validité est obligatoire")
    private Integer validiteMinutes; // durée de validité en minutes (ex: 60)
}
