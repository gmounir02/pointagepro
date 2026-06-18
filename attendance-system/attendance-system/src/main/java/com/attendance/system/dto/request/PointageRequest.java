package com.attendance.system.dto.request;

import com.attendance.system.model.Pointage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PointageRequest {

    @NotBlank(message = "Le code QR est obligatoire")
    private String qrCode;

    @NotNull(message = "La latitude est obligatoire")
    private Double latitude;

    @NotNull(message = "La longitude est obligatoire")
    private Double longitude;

    @NotNull(message = "Le type de pointage est obligatoire")
    private Pointage.TypePointage type;

    private String note;

    private String photo; // Captured photo (Base64)
}
