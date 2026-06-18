package com.attendance.system.service;

import com.attendance.system.dto.request.PointageRequest;
import com.attendance.system.dto.request.JustificationRequest;
import com.attendance.system.dto.request.JustificationEvaluationRequest;
import com.attendance.system.exception.AttendanceException;
import com.attendance.system.model.*;
import com.attendance.system.repository.*;
import com.attendance.system.utils.GpsUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PointageService {

    private final PointageRepository pointageRepository;
    private final UserRepository userRepository;
    private final QrCodeRepository qrCodeRepository;
    private final EntrepriseConfigRepository configRepository;
    private final NotificationService notificationService;

    @Value("${app.work.start-hour:8}")
    private int workStartHour;

    @Value("${app.work.start-minute:30}")
    private int workStartMinute;

    @Value("${app.gps.default-radius:100}")
    private int defaultRadius;

    public Pointage pointer(String userEmail, PointageRequest request) {
        // 1. Charger l'utilisateur
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AttendanceException("Utilisateur introuvable"));

        // 2. Valider le QR code
        QrCode qrCode = qrCodeRepository.findByCode(request.getQrCode())
                .orElseThrow(() -> new AttendanceException("QR code invalide ou introuvable"));

        if (!qrCode.isValid()) {
            throw new AttendanceException(qrCode.isExpired()
                    ? "QR code expiré"
                    : "QR code déjà utilisé");
        }

        // 3. Valider la position GPS
        EntrepriseConfig config = configRepository.findFirstBy().orElse(null);
        if (config != null) {
            double distance = GpsUtils.calculerDistance(
                    request.getLatitude(), request.getLongitude(),
                    config.getLatitude(), config.getLongitude()
            );
            int rayon = config.getRayonMetres() != null ? config.getRayonMetres() : defaultRadius;
            if (distance > rayon) {
                throw new AttendanceException(String.format(
                        "Position GPS trop éloignée de l'entreprise (%.0fm, maximum autorisé: %dm)",
                        distance, rayon));
            }
        }

        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        // 4. Traiter selon le type (ENTREE / SORTIE)
        if (request.getType() == Pointage.TypePointage.ENTREE) {
            return traiterEntree(user, request, qrCode, today, now, config);
        } else {
            return traiterSortie(user, request, qrCode, today, now);
        }
    }

    private Pointage traiterEntree(User user, PointageRequest request, QrCode qrCode,
                                    LocalDate today, LocalDateTime now, EntrepriseConfig config) {
        // Charger tous les pointages du jour pour cet utilisateur
        List<Pointage> todayPointages = pointageRepository.findByUserIdAndDate(user.getId(), today);

        // Vérifier s'il y a déjà une session d'entrée active (non fermée par une sortie)
        boolean activeEntryExists = todayPointages.stream()
                .anyMatch(p -> p.getHeureEntree() != null && p.getHeureSortie() == null);
        if (activeEntryExists) {
            throw new AttendanceException("Vous avez déjà une session d'entrée active. Veuillez d'abord pointer votre sortie.");
        }

        // Détecter le retard (uniquement sur le tout premier pointage d'entrée de la journée)
        boolean isFirstEntry = todayPointages.isEmpty();
        boolean enRetard = false;
        if (isFirstEntry) {
            LocalTime heureDebut = (config != null && config.getHeureDebutTravail() != null)
                    ? config.getHeureDebutTravail()
                    : LocalTime.of(workStartHour, workStartMinute);

            int tolerance = (config != null && config.getToleranceRetardMinutes() != null)
                    ? config.getToleranceRetardMinutes() : 0;

            LocalTime heureLimit = heureDebut.plusMinutes(tolerance);
            enRetard = now.toLocalTime().isAfter(heureLimit);
        }

        // Marquer le QR comme utilisé
        qrCode.setUsed(true);
        qrCode.setUsedByUserId(user.getId());
        qrCode.setUsedByUserEmail(user.getEmail());
        qrCode.setUsedByUserName(user.getFirstName() + " " + user.getLastName());
        qrCode.setUsedAt(LocalDateTime.now());
        qrCodeRepository.save(qrCode);

        Pointage pointage = Pointage.builder()
                .userId(user.getId())
                .userFullName(user.getFirstName() + " " + user.getLastName())
                .date(today)
                .heureEntree(now)
                .latitudeEntree(request.getLatitude())
                .longitudeEntree(request.getLongitude())
                .qrCodeId(qrCode.getId())
                .enRetard(enRetard)
                .type(Pointage.TypePointage.ENTREE)
                .note(request.getNote())
                .photoEntree(request.getPhoto())
                .build();

        pointageRepository.save(pointage);
        log.info("Entrée enregistrée: {} à {} (premier pointage de la journée: {}, retard: {})", 
                user.getEmail(), now, isFirstEntry, enRetard);
        return pointage;
    }

    private Pointage traiterSortie(User user, PointageRequest request, QrCode qrCode,
                                    LocalDate today, LocalDateTime now) {
        // Charger tous les pointages du jour pour cet utilisateur
        List<Pointage> todayPointages = pointageRepository.findByUserIdAndDate(user.getId(), today);

        // Trouver la session d'entrée active (qui n'a pas encore de sortie enregistrée)
        Pointage activePointage = todayPointages.stream()
                .filter(p -> p.getHeureEntree() != null && p.getHeureSortie() == null)
                .findFirst()
                .orElseThrow(() -> new AttendanceException(
                        "Aucune entrée active trouvée pour aujourd'hui. Veuillez d'abord pointer votre entrée."));

        // Calculer la durée de travail de cette session
        long dureeMinutes = ChronoUnit.MINUTES.between(activePointage.getHeureEntree(), now);

        // Détecter la sortie anticipée et l'insuffisance d'heures
        EntrepriseConfig config = configRepository.findFirstBy().orElse(null);
        boolean sortieAnticipee = false;
        if (config != null && config.getHeureFinTravail() != null) {
            sortieAnticipee = now.toLocalTime().isBefore(config.getHeureFinTravail());
        }

        long totalDureeMinutesAujourdHui = todayPointages.stream()
                .filter(p -> p.getDureeMinutes() != null && !p.getId().equals(activePointage.getId()))
                .mapToLong(Pointage::getDureeMinutes)
                .sum() + dureeMinutes;
        boolean heuresInsuffisantes = totalDureeMinutesAujourdHui < 480; // seuil de 8 heures (480 minutes)

        // Marquer le QR comme utilisé
        qrCode.setUsed(true);
        qrCode.setUsedByUserId(user.getId());
        qrCode.setUsedByUserEmail(user.getEmail());
        qrCode.setUsedByUserName(user.getFirstName() + " " + user.getLastName());
        qrCode.setUsedAt(LocalDateTime.now());
        qrCodeRepository.save(qrCode);

        // Mettre à jour le pointage d'entrée actif avec les infos de sortie
        activePointage.setHeureSortie(now);
        activePointage.setLatitudeSortie(request.getLatitude());
        activePointage.setLongitudeSortie(request.getLongitude());
        activePointage.setDureeMinutes(dureeMinutes);
        activePointage.setSortieAnticipee(sortieAnticipee);
        activePointage.setHeuresInsuffisantes(heuresInsuffisantes);
        activePointage.setPhotoSortie(request.getPhoto());

        pointageRepository.save(activePointage);
        log.info("Sortie enregistrée: {} à {} (durée de cette session: {} min, sortie anticipée: {}, heures insuffisantes: {})", 
                user.getEmail(), now, dureeMinutes, sortieAnticipee, heuresInsuffisantes);
        return activePointage;
    }

    public List<Pointage> getMesPointages(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AttendanceException("Utilisateur introuvable"));
        return pointageRepository.findByUserId(user.getId());
    }

    public List<Pointage> getPointagesByDate(LocalDate date) {
        return pointageRepository.findByDate(date);
    }

    public List<Pointage> getPointagesByUser(String userId) {
        return pointageRepository.findByUserId(userId);
    }

    public List<Pointage> getPointagesByPeriode(String userId, LocalDate debut, LocalDate fin) {
        return pointageRepository.findByUserIdAndDateBetween(userId, debut, fin);
    }

    public List<Pointage> getJustificationsEnAttente() {
        return pointageRepository.findByStatutJustification("EN_ATTENTE");
    }

    public Pointage soumettreJustification(String pointageId, String userEmail, JustificationRequest request) {
        Pointage pointage = pointageRepository.findById(pointageId)
                .orElseThrow(() -> new AttendanceException("Pointage introuvable"));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AttendanceException("Utilisateur introuvable"));

        if (!pointage.getUserId().equals(user.getId())) {
            throw new AttendanceException("Vous n'êtes pas autorisé à justifier ce pointage");
        }

        if (!pointage.isEnRetard()) {
            throw new AttendanceException("Ce pointage n'a pas été marqué en retard");
        }

        pointage.setJustificationMotif(request.getMotif());
        pointage.setJustificatifFichier(request.getFichierBase64());
        pointage.setStatutJustification("EN_ATTENTE");

        Pointage saved = pointageRepository.save(pointage);

        // 🔔 NOTIFY ADMINS
        try {
            List<User> admins = userRepository.findByRoles(User.Role.ROLE_ADMIN);
            String name = user.getFirstName() + " " + user.getLastName();
            for (User admin : admins) {
                notificationService.createNotification(
                        admin.getId(),
                        "Nouvelle justification",
                        name + " a soumis une justification pour son retard du " + pointage.getDate(),
                        "NEW_JUSTIFICATION"
                );
            }
        } catch (Exception e) {
            log.error("Failed to trigger justification submission notifications: {}", e.getMessage());
        }

        log.info("Justification soumise pour le pointage {} par {}", pointageId, userEmail);
        return saved;
    }

    public Pointage evaluerJustification(String pointageId, JustificationEvaluationRequest request) {
        Pointage pointage = pointageRepository.findById(pointageId)
                .orElseThrow(() -> new AttendanceException("Pointage introuvable"));

        String statut = request.getStatut();
        if (!"APPROUVEE".equals(statut) && !"REJETEE".equals(statut)) {
            throw new AttendanceException("Statut d'évaluation invalide. Utilisez APPROUVEE ou REJETEE");
        }

        pointage.setStatutJustification(statut);
        if ("APPROUVEE".equals(statut)) {
            pointage.setEnRetard(false);
            pointage.setNote(pointage.getNote() != null 
                    ? pointage.getNote() + " (Retard justifié)" 
                    : "Retard justifié");
            log.info("Justification approuvée pour le pointage {}. Flag enRetard réinitialisé.", pointageId);
        } else {
            log.info("Justification rejetée pour le pointage {}.", pointageId);
        }

        Pointage saved = pointageRepository.save(pointage);

        // 🔔 NOTIFY EMPLOYEE
        try {
            User employee = userRepository.findById(pointage.getUserId()).orElse(null);
            if (employee != null) {
                String title = "Justification APPROUVÉE";
                String msg = "Votre justification pour le retard du " + pointage.getDate() + " a été acceptée par l'administrateur.";
                String type = "JUSTIFICATION_APPROVED";
                
                if ("REJETEE".equals(statut)) {
                    title = "Justification REJETÉE";
                    msg = "Votre justification pour le retard du " + pointage.getDate() + " a été refusée par l'administrateur.";
                    type = "JUSTIFICATION_REJECTED";
                }
                
                notificationService.createNotification(
                        employee.getId(),
                        title,
                        msg,
                        type
                );
            }
        } catch (Exception e) {
            log.error("Failed to trigger justification evaluation notification: {}", e.getMessage());
        }

        return saved;
    }
}
