package com.attendance.system.repository;

import com.attendance.system.model.QrCode;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface QrCodeRepository extends MongoRepository<QrCode, String> {

    Optional<QrCode> findByCode(String code);

    List<QrCode> findByUsedFalseAndExpiresAtAfter(LocalDateTime now);

    // Fetch all QR codes that are still within their validity window, regardless of scan count.
    // A QR code is a shared scan point usable by multiple employees until it expires.
    List<QrCode> findByExpiresAtAfter(LocalDateTime now);

    List<QrCode> findByExpiresAtBefore(LocalDateTime now);

    void deleteByExpiresAtBefore(LocalDateTime now);
}
