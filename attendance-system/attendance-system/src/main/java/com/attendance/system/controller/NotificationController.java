package com.attendance.system.controller;

import com.attendance.system.dto.response.ApiResponse;
import com.attendance.system.model.Notification;
import com.attendance.system.model.User;
import com.attendance.system.repository.UserRepository;
import com.attendance.system.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Notification>>> getNotifications(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        
        List<Notification> list = notificationService.getNotificationsForUser(user.getId());
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable String id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success("Notification marquée comme lue", null));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        
        notificationService.markAllAsRead(user.getId());
        return ResponseEntity.ok(ApiResponse.success("Toutes les notifications ont été marquées comme lues", null));
    }
}
