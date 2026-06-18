package com.attendance.system.controller;

import com.attendance.system.dto.request.CongeRequest;
import com.attendance.system.dto.response.ApiResponse;
import com.attendance.system.model.Conge;
import com.attendance.system.service.CongeService;
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
@RequestMapping("/api/conges")
@RequiredArgsConstructor
public class CongeController {

    private final CongeService congeService;

    @PostMapping
    public ResponseEntity<ApiResponse<Conge>> demanderConge(
            @Valid @RequestBody CongeRequest request,
            Authentication auth) {
        Conge conge = congeService.demanderConge(auth.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Demande de congé soumise", conge));
    }

    @GetMapping("/mes-conges")
    public ResponseEntity<ApiResponse<List<Conge>>> getMesConges(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(congeService.getMesConges(auth.getName())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> supprimerConge(
            @PathVariable String id, Authentication auth) {
        congeService.supprimerConge(id, auth.getName());
        return ResponseEntity.ok(ApiResponse.success("Demande supprimée", null));
    }

    // Routes Admin
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Conge>>> getAllConges() {
        return ResponseEntity.ok(ApiResponse.success(congeService.getAllConges()));
    }

    @GetMapping("/en-attente")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Conge>>> getCongesEnAttente() {
        return ResponseEntity.ok(ApiResponse.success(congeService.getCongesEnAttente()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Conge>> getCongeById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(congeService.getCongeById(id)));
    }

    @PatchMapping("/{id}/approuver")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Conge>> approuverConge(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        String commentaire = body != null ? body.get("commentaire") : null;
        Conge conge = congeService.validerConge(id, auth.getName(), true, commentaire);
        return ResponseEntity.ok(ApiResponse.success("Congé approuvé", conge));
    }

    @PatchMapping("/{id}/refuser")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Conge>> refuserConge(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        String commentaire = body != null ? body.get("commentaire") : null;
        Conge conge = congeService.validerConge(id, auth.getName(), false, commentaire);
        return ResponseEntity.ok(ApiResponse.success("Congé refusé", conge));
    }
}
