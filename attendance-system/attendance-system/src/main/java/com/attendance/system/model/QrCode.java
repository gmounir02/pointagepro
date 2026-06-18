package com.attendance.system.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "qr_codes")
public class QrCode {

    @Id
    private String id;

    private String code;           // UUID unique

    private String imageBase64;    // image QR encodée en base64

    private LocalDateTime createdAt;

    private LocalDateTime expiresAt;

    private boolean used;

    private String createdByAdminId;

    private String description;

    private String usedByUserId;
    private String usedByUserEmail;
    private String usedByUserName;
    private LocalDateTime usedAt;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isValid() {
        return !used && !isExpired();
    }
}
