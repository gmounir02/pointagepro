package com.attendance.system.service;

import com.attendance.system.dto.request.QrCodeRequest;
import com.attendance.system.exception.AttendanceException;
import com.attendance.system.model.EntrepriseConfig;
import com.attendance.system.model.QrCode;
import com.attendance.system.model.User;
import com.attendance.system.repository.EntrepriseConfigRepository;
import com.attendance.system.repository.QrCodeRepository;
import com.attendance.system.repository.UserRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import org.springframework.data.domain.Sort;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class QrCodeService {

    private final QrCodeRepository qrCodeRepository;
    private final UserRepository userRepository;
    private final EntrepriseConfigRepository configRepository;

    public QrCode genererQrCode(String adminEmail, QrCodeRequest request) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new AttendanceException("Admin introuvable"));

        String code = UUID.randomUUID().toString();
        String imageBase64 = genererImageQr(code);

        LocalDateTime maintenant = LocalDateTime.now();
        LocalDateTime expiration = maintenant.plusMinutes(request.getValiditeMinutes());

        QrCode qrCode = QrCode.builder()
                .code(code)
                .imageBase64(imageBase64)
                .createdAt(maintenant)
                .expiresAt(expiration)
                .used(false)
                .createdByAdminId(admin.getId())
                .description(request.getDescription())
                .build();

        qrCodeRepository.save(qrCode);
        log.info("QR code généré par {} - expire à {}", admin.getEmail(), expiration);
        return qrCode;
    }

    public List<QrCode> getQrCodesActifs() {
        return qrCodeRepository.findByUsedFalseAndExpiresAtAfter(LocalDateTime.now());
    }

    public QrCode getQrCodeById(String id) {
        return qrCodeRepository.findById(id)
                .orElseThrow(() -> new AttendanceException("QR code introuvable"));
    }

    public boolean verifierQrCode(String code) {
        return qrCodeRepository.findByCode(code)
                .map(QrCode::isValid)
                .orElse(false);
    }

    private String genererImageQr(String content) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, 300, 300);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

            return Base64.getEncoder().encodeToString(outputStream.toByteArray());
        } catch (WriterException | IOException e) {
            log.error("Erreur génération QR code: {}", e.getMessage());
            throw new AttendanceException("Impossible de générer le QR code");
        }
    }

    public List<QrCode> getHistoriqueQrCodes() {
        return qrCodeRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    /**
     * Génération automatique du QR code chaque jour à 06:00.
     * Le QR code expire à l'heure de début de travail configurée + 30 minutes.
     * Ex: si heureDebutTravail = 08:30 -> le QR expire à 09:00.
     */
    @Scheduled(cron = "0 0 6 * * *")
    public void genererQrCodeAutomatique() {
        try {
            EntrepriseConfig config = configRepository.findFirstBy().orElse(null);

            LocalTime heureDebut = (config != null && config.getHeureDebutTravail() != null)
                    ? config.getHeureDebutTravail()
                    : LocalTime.of(8, 30);

            LocalDateTime now = LocalDateTime.now();
            LocalDateTime expiration = LocalDate.now().atTime(heureDebut).plusMinutes(30);

            // Si l'expiration est déjà passée (ne devrait pas arriver à 6h), on met +30 min depuis maintenant
            if (expiration.isBefore(now)) {
                expiration = now.plusMinutes(30);
            }

            long validiteMinutes = ChronoUnit.MINUTES.between(now, expiration);

            String code = UUID.randomUUID().toString();
            String imageBase64 = genererImageQr(code);

            QrCode qrCode = QrCode.builder()
                    .code(code)
                    .imageBase64(imageBase64)
                    .createdAt(now)
                    .expiresAt(expiration)
                    .used(false)
                    .createdByAdminId("SYSTEM")
                    .description("QR automatique du " + LocalDate.now() + " (expire à " + expiration.toLocalTime() + ")")
                    .build();

            qrCodeRepository.save(qrCode);
            log.info("QR code automatique généré à {} — expire à {} (validité: {} min)",
                    now, expiration, validiteMinutes);
        } catch (Exception e) {
            log.error("Erreur lors de la génération automatique du QR code: {}", e.getMessage());
        }
    }
}
