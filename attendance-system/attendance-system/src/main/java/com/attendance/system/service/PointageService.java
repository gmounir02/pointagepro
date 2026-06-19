package com.attendance.system.service;

import com.attendance.system.dto.request.PointageRequest;
import com.attendance.system.dto.request.PointageUpdateRequest;
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
    private final CongeRepository congeRepository;

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
            throw new AttendanceException("QR code expiré ou invalide");
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

        // Enregistrer le dernier employé ayant scanné ce QR (métadonnée, ne bloque pas le re-scan)
        qrCode.setUsed(true);
        qrCode.setUsedByUserId(user.getId());
        qrCode.setUsedByUserEmail(user.getEmail());
        qrCode.setUsedByUserName(user.getFirstName() + " " + user.getLastName());
        qrCode.setUsedAt(LocalDateTime.now());
        qrCodeRepository.save(qrCode);
        // Note: isValid() only checks expiry, so this QR remains usable by other employees.

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

        // Enregistrer le dernier employé ayant scanné ce QR (métadonnée, ne bloque pas le re-scan)
        qrCode.setUsed(true);
        qrCode.setUsedByUserId(user.getId());
        qrCode.setUsedByUserEmail(user.getEmail());
        qrCode.setUsedByUserName(user.getFirstName() + " " + user.getLastName());
        qrCode.setUsedAt(LocalDateTime.now());
        qrCodeRepository.save(qrCode);
        // Note: isValid() only checks expiry, so this QR remains usable by other employees.

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

    private boolean isJourFerieMarocain(LocalDate date) {
        int day = date.getDayOfMonth();
        int month = date.getMonthValue();
        
        // Jours fériés civils fixes au Maroc
        if (month == 1 && day == 1) return true;   // Nouvel An
        if (month == 1 && day == 11) return true;  // Manifeste de l'Indépendance
        if (month == 1 && day == 14) return true;  // Nouvel An Amazigh (Yennayer)
        if (month == 5 && day == 1) return true;   // Fête du Travail
        if (month == 7 && day == 30) return true;  // Fête du Trône
        if (month == 8 && day == 14) return true;  // Allégeance Oued Ed-Dahab
        if (month == 8 && day == 20) return true;  // Révolution du Roi et du Peuple
        if (month == 8 && day == 21) return true;  // Fête de la Jeunesse
        if (month == 11 && day == 6) return true;  // Anniversaire de la Marche Verte
        if (month == 11 && day == 18) return true; // Fête de l'Indépendance
        
        return false;
    }

    private List<Pointage> synthesizeAbsences(List<Pointage> realPointages, User user) {
        java.util.List<Pointage> result = new java.util.ArrayList<>(realPointages);
        
        LocalDate startDate = user.getCreatedAt() != null 
                ? user.getCreatedAt().toLocalDate() 
                : LocalDate.now().minusDays(30);
        LocalDate endDate = LocalDate.now();
        
        // Récupérer les congés approuvés pour cet utilisateur
        List<Conge> conges = congeRepository.findByUserId(user.getId());
        
        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            // Ignorer les weekends
            java.time.DayOfWeek dayOfWeek = currentDate.getDayOfWeek();
            if (dayOfWeek == java.time.DayOfWeek.SATURDAY || dayOfWeek == java.time.DayOfWeek.SUNDAY) {
                currentDate = currentDate.plusDays(1);
                continue;
            }
            
            // Ignorer les jours fériés marocains
            if (isJourFerieMarocain(currentDate)) {
                currentDate = currentDate.plusDays(1);
                continue;
            }
            
            // Vérifier s'il y a déjà un pointage pour cette date
            final LocalDate dateToCheck = currentDate;
            boolean hasPointage = realPointages.stream().anyMatch(p -> p.getDate().equals(dateToCheck));
            if (hasPointage) {
                currentDate = currentDate.plusDays(1);
                continue;
            }
            
            // Vérifier si l'employé est en congé approuvé ce jour-là
            boolean enConge = conges.stream()
                .anyMatch(c -> c.getStatut() == Conge.StatutConge.APPROUVE && 
                               !dateToCheck.isBefore(c.getDateDebut()) && 
                               !dateToCheck.isAfter(c.getDateFin()));
            if (enConge) {
                currentDate = currentDate.plusDays(1);
                continue;
            }
            
            // Si pas de pointage et pas en congé -> Absence automatique
            Pointage tempAbsence = Pointage.builder()
                    .id("temp-ABSENCE-" + currentDate)
                    .userId(user.getId())
                    .userFullName(user.getFirstName() + " " + user.getLastName())
                    .date(currentDate)
                    .type(Pointage.TypePointage.ABSENCE)
                    .statutJustification("NON_JUSTIFIE")
                    .note("Absence automatique - Non pointé")
                    .heuresInsuffisantes(true)
                    .build();
            
            result.add(tempAbsence);
            currentDate = currentDate.plusDays(1);
        }
        
        // Trier par date décroissante
        result.sort((p1, p2) -> p2.getDate().compareTo(p1.getDate()));
        
        return result;
    }

    public List<Pointage> getMesPointages(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AttendanceException("Utilisateur introuvable"));
        List<Pointage> realPointages = pointageRepository.findByUserId(user.getId());
        return synthesizeAbsences(realPointages, user);
    }

    public List<Pointage> getPointagesByDate(LocalDate date) {
        return pointageRepository.findByDate(date);
    }

    public List<Pointage> getPointagesByUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AttendanceException("Utilisateur introuvable"));
        List<Pointage> realPointages = pointageRepository.findByUserId(userId);
        return synthesizeAbsences(realPointages, user);
    }

    public List<Pointage> getPointagesByPeriode(String userId, LocalDate debut, LocalDate fin) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AttendanceException("Utilisateur introuvable"));
        List<Pointage> realPointages = pointageRepository.findByUserIdAndDateBetween(userId, debut, fin);
        List<Pointage> allSynthesized = synthesizeAbsences(realPointages, user);
        return allSynthesized.stream()
                .filter(p -> !p.getDate().isBefore(debut) && !p.getDate().isAfter(fin))
                .toList();
    }

    public List<Pointage> getJustificationsEnAttente() {
        return pointageRepository.findByStatutJustification("EN_ATTENTE");
    }

    public Pointage soumettreJustification(String pointageId, String userEmail, JustificationRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AttendanceException("Utilisateur introuvable"));
        
        Pointage pointage;
        if (pointageId.startsWith("temp-ABSENCE-")) {
            String dateStr = pointageId.substring("temp-ABSENCE-".length());
            LocalDate date = LocalDate.parse(dateStr);
            pointage = Pointage.builder()
                    .userId(user.getId())
                    .userFullName(user.getFirstName() + " " + user.getLastName())
                    .date(date)
                    .type(Pointage.TypePointage.ABSENCE)
                    .statutJustification("EN_ATTENTE")
                    .note("Absence automatique - Non pointé")
                    .heuresInsuffisantes(true)
                    .build();
            pointage = pointageRepository.save(pointage);
            log.info("Création d'un enregistrement d'absence réel pour la date {} suite à justification", date);
        } else {
            pointage = pointageRepository.findById(pointageId)
                    .orElseThrow(() -> new AttendanceException("Pointage introuvable"));
        }

        if (!pointage.getUserId().equals(user.getId())) {
            throw new AttendanceException("Vous n'êtes pas autorisé à justifier ce pointage");
        }

        if (!pointage.isEnRetard() && pointage.getType() != Pointage.TypePointage.ABSENCE) {
            throw new AttendanceException("Ce pointage n'est ni en retard ni une absence à justifier");
        }

        pointage.setJustificationMotif(request.getMotif());
        pointage.setJustificatifFichier(request.getFichierBase64());
        pointage.setStatutJustification("EN_ATTENTE");

        Pointage saved = pointageRepository.save(pointage);

        // 🔔 NOTIFY ADMINS
        try {
            List<User> admins = userRepository.findByRoles(User.Role.ROLE_ADMIN);
            String name = user.getFirstName() + " " + user.getLastName();
            String label = pointage.getType() == Pointage.TypePointage.ABSENCE ? "son absence" : "son retard";
            for (User admin : admins) {
                notificationService.createNotification(
                        admin.getId(),
                        "Nouvelle justification",
                        name + " a soumis une justification pour " + label + " du " + pointage.getDate(),
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
        boolean isAbsence = pointage.getType() == Pointage.TypePointage.ABSENCE;
        if ("APPROUVEE".equals(statut)) {
            if (isAbsence) {
                pointage.setHeuresInsuffisantes(false);
                pointage.setNote(pointage.getNote() != null 
                        ? pointage.getNote() + " (Absence justifiée)" 
                        : "Absence justifiée");
                log.info("Justification approuvée pour l'absence {}.", pointageId);
            } else {
                pointage.setEnRetard(false);
                pointage.setNote(pointage.getNote() != null 
                        ? pointage.getNote() + " (Retard justifié)" 
                        : "Retard justifié");
                log.info("Justification approuvée pour le retard {}. Flag enRetard réinitialisé.", pointageId);
            }
        } else {
            log.info("Justification rejetée pour le pointage {} (type: {}).", pointageId, pointage.getType());
        }

        Pointage saved = pointageRepository.save(pointage);

        // 🔔 NOTIFY EMPLOYEE
        try {
            User employee = userRepository.findById(pointage.getUserId()).orElse(null);
            if (employee != null) {
                String term = isAbsence ? "l'absence" : "le retard";
                String title = "Justification APPROUVÉE";
                String msg = "Votre justification pour " + term + " du " + pointage.getDate() + " a été acceptée par l'administrateur.";
                String type = "JUSTIFICATION_APPROVED";
                
                if ("REJETEE".equals(statut)) {
                    title = "Justification REJETÉE";
                    msg = "Votre justification pour " + term + " du " + pointage.getDate() + " a été refusée par l'administrateur.";
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

    public void marquerAbsences(LocalDate date) {
        log.info("Début du traitement des absences automatiques pour le {}", date);
        List<User> employes = userRepository.findByRoles(User.Role.ROLE_EMPLOYE);
        
        for (User emp : employes) {
            if (!emp.isActive()) {
                continue;
            }
            
            // 1. Vérifier si l'employé a déjà un pointage (Entrée ou Sortie ou Absence) pour ce jour
            List<Pointage> pointagesDuJour = pointageRepository.findByUserIdAndDate(emp.getId(), date);
            if (!pointagesDuJour.isEmpty()) {
                continue; // Déjà pointé ou déjà marqué absent
            }
            
            // 2. Vérifier s'il a un congé approuvé pour ce jour
            List<Conge> congesDuJour = congeRepository.findActiveCongeForUserOnDate(emp.getId(), date);
            boolean enConge = congesDuJour.stream()
                    .anyMatch(c -> c.getStatut() == Conge.StatutConge.APPROUVE);
            if (enConge) {
                continue; // En congé approuvé, donc pas absent injustifié
            }
            
            // 3. Créer une absence automatique
            Pointage absence = Pointage.builder()
                    .userId(emp.getId())
                    .userFullName(emp.getFirstName() + " " + emp.getLastName())
                    .date(date)
                    .type(Pointage.TypePointage.ABSENCE)
                    .statutJustification("NON_JUSTIFIE")
                    .note("Absence automatique - Non pointé")
                    .enRetard(false)
                    .sortieAnticipee(false)
                    .heuresInsuffisantes(true)
                    .build();
                    
            pointageRepository.save(absence);
            log.info("Absence enregistrée pour {} ({}) le {}", emp.getEmail(), emp.getId(), date);
        }
        log.info("Fin du traitement des absences automatiques.");
    }

    public Pointage modifierPointageParAdmin(String id, PointageUpdateRequest request, String adminEmail) {
        Pointage pointage;
        if (id.startsWith("temp-ABSENCE-")) {
            if (request.getUserId() == null || request.getUserId().trim().isEmpty()) {
                throw new AttendanceException("Identifiant de l'employé requis pour régulariser une absence.");
            }
            User employee = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new AttendanceException("Employé introuvable"));
            
            String dateStr = id.substring("temp-ABSENCE-".length());
            LocalDate date = LocalDate.parse(dateStr);
            
            Pointage newAbsence = Pointage.builder()
                    .userId(employee.getId())
                    .userFullName(employee.getFirstName() + " " + employee.getLastName())
                    .date(date)
                    .type(Pointage.TypePointage.ABSENCE)
                    .statutJustification("NON_JUSTIFIE")
                    .note("Absence automatique - Non pointé")
                    .heuresInsuffisantes(true)
                    .build();
            pointage = pointageRepository.save(newAbsence);
            log.info("Création d'un enregistrement d'absence réel pour la date {} par l'admin lors de la régularisation", date);
        } else {
            pointage = pointageRepository.findById(id)
                    .orElseThrow(() -> new AttendanceException("Pointage introuvable"));
        }

        // Règle métier : Une session complète (où entrée ET sortie sont déjà renseignées) ne peut pas être modifiée
        // sauf si le type est ABSENCE (ce qui permet de régulariser une absence automatique)
        if (pointage.getHeureEntree() != null && pointage.getHeureSortie() != null && pointage.getType() != Pointage.TypePointage.ABSENCE) {
            throw new AttendanceException("Une session de pointage complète ne peut pas être modifiée.");
        }

        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new AttendanceException("Administrateur introuvable"));

        // Parser les heures si elles sont fournies
        LocalDateTime newHeureEntree = null;
        if (request.getHeureEntree() != null && !request.getHeureEntree().trim().isEmpty()) {
            newHeureEntree = LocalDateTime.parse(request.getHeureEntree().trim());
        }

        LocalDateTime newHeureSortie = null;
        if (request.getHeureSortie() != null && !request.getHeureSortie().trim().isEmpty()) {
            newHeureSortie = LocalDateTime.parse(request.getHeureSortie().trim());
        }

        // Mettre à jour les champs
        if (newHeureEntree != null) {
            pointage.setHeureEntree(newHeureEntree);
        }
        if (newHeureSortie != null) {
            pointage.setHeureSortie(newHeureSortie);
        }
        if (request.getType() != null) {
            pointage.setType(request.getType());
        }
        if (request.getNote() != null) {
            pointage.setNote(request.getNote());
        }

        // Traçabilité
        pointage.setModifiedByAdminId(admin.getId());
        pointage.setModifiedByAdminName(admin.getFirstName() + " " + admin.getLastName());
        pointage.setModifiedAt(LocalDateTime.now());

        // Recalculer les statuts et durées
        EntrepriseConfig config = configRepository.findFirstBy().orElse(null);

        // 1. Durée
        if (pointage.getHeureEntree() != null && pointage.getHeureSortie() != null) {
            long duration = ChronoUnit.MINUTES.between(pointage.getHeureEntree(), pointage.getHeureSortie());
            pointage.setDureeMinutes(duration);
        } else {
            pointage.setDureeMinutes(null);
        }

        // 2. Retard
        if (pointage.getHeureEntree() != null) {
            LocalTime heureDebut = (config != null && config.getHeureDebutTravail() != null)
                    ? config.getHeureDebutTravail()
                    : LocalTime.of(workStartHour, workStartMinute);

            int tolerance = (config != null && config.getToleranceRetardMinutes() != null)
                    ? config.getToleranceRetardMinutes() : 0;

            LocalTime heureLimit = heureDebut.plusMinutes(tolerance);
            pointage.setEnRetard(pointage.getHeureEntree().toLocalTime().isAfter(heureLimit));
        } else {
            pointage.setEnRetard(false);
        }

        // 3. Sortie anticipée
        if (pointage.getHeureSortie() != null) {
            if (config != null && config.getHeureFinTravail() != null) {
                pointage.setSortieAnticipee(pointage.getHeureSortie().toLocalTime().isBefore(config.getHeureFinTravail()));
            } else {
                pointage.setSortieAnticipee(false);
            }
        } else {
            pointage.setSortieAnticipee(false);
        }

        // 4. Heures insuffisantes sur la journée
        final String currentPointageId = pointage.getId();
        if (pointage.getHeureEntree() != null && pointage.getHeureSortie() != null) {
            List<Pointage> dayPointages = pointageRepository.findByUserIdAndDate(pointage.getUserId(), pointage.getDate());
            long totalDureeMinutesAujourdHui = dayPointages.stream()
                    .filter(p -> p.getDureeMinutes() != null && !p.getId().equals(currentPointageId))
                    .mapToLong(Pointage::getDureeMinutes)
                    .sum() + pointage.getDureeMinutes();
            pointage.setHeuresInsuffisantes(totalDureeMinutesAujourdHui < 480);
        } else {
            pointage.setHeuresInsuffisantes(false);
        }

        return pointageRepository.save(pointage);
    }

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 59 23 * * *")
    public void scheduledMarquerAbsences() {
        marquerAbsences(LocalDate.now());
    }
}
