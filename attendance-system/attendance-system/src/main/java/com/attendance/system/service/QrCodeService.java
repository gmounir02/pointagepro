package com.attendance.system.service;

import com.attendance.system.dto.request.QrCodeRequest;
import com.attendance.system.exception.AttendanceException;
import com.attendance.system.model.QrCode;
import com.attendance.system.model.User;
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
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class QrCodeService {

    private final QrCodeRepository qrCodeRepository;
    private final UserRepository userRepository;

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

    // Nettoyage automatique désactivé pour conserver l'historique des codes QR expirés/utilisés
    // @Scheduled(fixedRate = 3600000)
    // public void nettoyerQrCodesExpires() {
    //     List<QrCode> expires = qrCodeRepository.findByExpiresAtBefore(LocalDateTime.now());
    //     if (!expires.isEmpty()) {
    //         qrCodeRepository.deleteByExpiresAtBefore(LocalDateTime.now());
    //         log.info("Nettoyage: {} QR code(s) expiré(s) supprimé(s)", expires.size());
    //     }
    // }
}
