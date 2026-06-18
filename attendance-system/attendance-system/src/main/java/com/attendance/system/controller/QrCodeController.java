package com.attendance.system.controller;

import com.attendance.system.dto.request.QrCodeRequest;
import com.attendance.system.dto.response.ApiResponse;
import com.attendance.system.model.QrCode;
import com.attendance.system.service.QrCodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/qrcodes")
@RequiredArgsConstructor
public class QrCodeController {

    private final QrCodeService qrCodeService;

    @PostMapping("/generate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<QrCode>> genererQrCode(
            @Valid @RequestBody QrCodeRequest request,
            Authentication auth) {
        QrCode qrCode = qrCodeService.genererQrCode(auth.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("QR code généré", qrCode));
    }

    @GetMapping("/actifs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<QrCode>>> getQrCodesActifs() {
        return ResponseEntity.ok(ApiResponse.success(qrCodeService.getQrCodesActifs()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<QrCode>> getQrCode(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(qrCodeService.getQrCodeById(id)));
    }

    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> verifierQrCode(
            @RequestBody Map<String, String> body) {
        boolean valide = qrCodeService.verifierQrCode(body.get("code"));
        return ResponseEntity.ok(ApiResponse.success(Map.of("valid", valide)));
    }
}
