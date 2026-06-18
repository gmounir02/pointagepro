package com.attendance.system.controller;

import com.attendance.system.dto.request.PointageRequest;
import com.attendance.system.dto.request.JustificationRequest;
import com.attendance.system.dto.request.JustificationEvaluationRequest;
import com.attendance.system.dto.response.ApiResponse;
import com.attendance.system.model.Pointage;
import com.attendance.system.service.PointageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/pointages")
@RequiredArgsConstructor
public class PointageController {

    private final PointageService pointageService;

    /**
     * POST /api/pointages - Pointer (entrée ou sortie)
     * Nécessite : JWT valide + QR code valide + GPS valide
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Pointage>> pointer(
            @Valid @RequestBody PointageRequest request,
            Authentication auth) {
        Pointage pointage = pointageService.pointer(auth.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Pointage enregistré avec succès", pointage));
    }

    @GetMapping("/mes-pointages")
    public ResponseEntity<ApiResponse<List<Pointage>>> getMesPointages(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(
                pointageService.getMesPointages(auth.getName())));
    }

    @GetMapping("/date/{date}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Pointage>>> getByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(ApiResponse.success(pointageService.getPointagesByDate(date)));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Pointage>>> getByUser(@PathVariable String userId) {
        return ResponseEntity.ok(ApiResponse.success(pointageService.getPointagesByUser(userId)));
    }

    @GetMapping("/user/{userId}/periode")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Pointage>>> getByUserAndPeriode(
            @PathVariable String userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate debut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {
        return ResponseEntity.ok(ApiResponse.success(
                pointageService.getPointagesByPeriode(userId, debut, fin)));
    }

    @PostMapping("/{id}/justifier")
    public ResponseEntity<ApiResponse<Pointage>> justifier(
            @PathVariable String id,
            @Valid @RequestBody JustificationRequest request,
            Authentication auth) {
        Pointage pointage = pointageService.soumettreJustification(id, auth.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Justification de retard soumise avec succès", pointage));
    }

    @PatchMapping("/{id}/evaluer-justification")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Pointage>> evaluerJustification(
            @PathVariable String id,
            @Valid @RequestBody JustificationEvaluationRequest request) {
        Pointage pointage = pointageService.evaluerJustification(id, request);
        return ResponseEntity.ok(ApiResponse.success("Justification de retard évaluée avec succès", pointage));
    }

    @GetMapping("/justifications/en-attente")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Pointage>>> getJustificationsEnAttente() {
        return ResponseEntity.ok(ApiResponse.success(pointageService.getJustificationsEnAttente()));
    }

    @PostMapping("/generer-absences")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> genererAbsences(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        pointageService.marquerAbsences(targetDate);
        return ResponseEntity.ok(ApiResponse.success("Absences automatiques traitées pour le " + targetDate, null));
    }
}
