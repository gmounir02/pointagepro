package com.attendance.system.controller;

import com.attendance.system.dto.request.EntrepriseConfigRequest;
import com.attendance.system.dto.response.ApiResponse;
import com.attendance.system.model.EntrepriseConfig;
import com.attendance.system.service.EntrepriseConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class EntrepriseConfigController {

    private final EntrepriseConfigService configService;

    @GetMapping
    public ResponseEntity<ApiResponse<EntrepriseConfig>> getConfig() {
        return ResponseEntity.ok(ApiResponse.success(configService.getConfig()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EntrepriseConfig>> sauvegarderConfig(
            @Valid @RequestBody EntrepriseConfigRequest request,
            Authentication auth) {
        EntrepriseConfig config = configService.sauvegarderConfig(auth.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Configuration mise à jour", config));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EntrepriseConfig>> updateConfig(
            @Valid @RequestBody EntrepriseConfigRequest request,
            Authentication auth) {
        EntrepriseConfig config = configService.sauvegarderConfig(auth.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Configuration mise à jour", config));
    }
}
