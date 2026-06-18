package com.attendance.system.service;

import com.attendance.system.dto.request.CongeRequest;
import com.attendance.system.exception.AttendanceException;
import com.attendance.system.model.Conge;
import com.attendance.system.model.User;
import com.attendance.system.repository.CongeRepository;
import com.attendance.system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CongeService {

    private final CongeRepository congeRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public Conge demanderConge(String userEmail, CongeRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AttendanceException("Utilisateur introuvable"));

        if (request.getDateFin().isBefore(request.getDateDebut())) {
            throw new AttendanceException("La date de fin ne peut pas être avant la date de début");
        }

        Conge conge = Conge.builder()
                .userId(user.getId())
                .userFullName(user.getFirstName() + " " + user.getLastName())
                .dateDebut(request.getDateDebut())
                .dateFin(request.getDateFin())
                .typeConge(request.getTypeConge())
                .motif(request.getMotif())
                .statut(Conge.StatutConge.EN_ATTENTE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        congeRepository.save(conge);
        log.info("Demande de congé créée par: {}", user.getEmail());

        // 🔔 NOTIFY ADMINS
        try {
            List<User> admins = userRepository.findByRoles(User.Role.ROLE_ADMIN);
            String name = user.getFirstName() + " " + user.getLastName();
            for (User admin : admins) {
                notificationService.createNotification(
                        admin.getId(),
                        "Nouvelle demande de congé",
                        name + " a soumis une demande de congé (" + conge.getTypeConge() + ") du " + conge.getDateDebut() + " au " + conge.getDateFin(),
                        "NEW_LEAVE"
                );
            }
        } catch (Exception e) {
            log.error("Failed to trigger leave request notifications: {}", e.getMessage());
        }

        return conge;
    }

    public Conge validerConge(String congeId, String adminEmail, boolean approuve, String commentaire) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new AttendanceException("Admin introuvable"));

        Conge conge = congeRepository.findById(congeId)
                .orElseThrow(() -> new AttendanceException("Demande de congé introuvable"));

        if (conge.getStatut() != Conge.StatutConge.EN_ATTENTE) {
            throw new AttendanceException("Cette demande a déjà été traitée");
        }

        conge.setStatut(approuve ? Conge.StatutConge.APPROUVE : Conge.StatutConge.REFUSE);
        conge.setAdminId(admin.getId());
        conge.setCommentaireAdmin(commentaire);
        conge.setUpdatedAt(LocalDateTime.now());

        congeRepository.save(conge);
        log.info("Congé {} par admin {}: {}", approuve ? "approuvé" : "refusé", admin.getEmail(), congeId);

        // 🔔 NOTIFY EMPLOYEE
        try {
            User employee = userRepository.findById(conge.getUserId()).orElse(null);
            if (employee != null) {
                String title = approuve ? "Congé APPROUVÉ" : "Congé REFUSÉ";
                String msg = "Votre demande de congé (" + conge.getTypeConge() + ") du " + conge.getDateDebut() + " a été " + (approuve ? "acceptée" : "refusée") + " par l'administrateur.";
                String type = approuve ? "LEAVE_APPROVED" : "LEAVE_REJECTED";
                
                notificationService.createNotification(
                        employee.getId(),
                        title,
                        msg,
                        type
                );
            }
        } catch (Exception e) {
            log.error("Failed to trigger leave validation notification: {}", e.getMessage());
        }

        return conge;
    }

    public List<Conge> getMesConges(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AttendanceException("Utilisateur introuvable"));
        return congeRepository.findByUserId(user.getId());
    }

    public List<Conge> getAllConges() {
        return congeRepository.findAll();
    }

    public List<Conge> getCongesEnAttente() {
        return congeRepository.findByStatut(Conge.StatutConge.EN_ATTENTE);
    }

    public Conge getCongeById(String id) {
        return congeRepository.findById(id)
                .orElseThrow(() -> new AttendanceException("Congé introuvable"));
    }

    public void supprimerConge(String congeId, String userEmail) {
        Conge conge = congeRepository.findById(congeId)
                .orElseThrow(() -> new AttendanceException("Congé introuvable"));
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AttendanceException("Utilisateur introuvable"));

        if (!conge.getUserId().equals(user.getId())) {
            throw new AttendanceException("Vous ne pouvez pas supprimer ce congé");
        }
        if (conge.getStatut() != Conge.StatutConge.EN_ATTENTE) {
            throw new AttendanceException("Impossible de supprimer un congé déjà traité");
        }

        congeRepository.delete(conge);
    }
}
