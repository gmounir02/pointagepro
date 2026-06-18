package com.attendance.system.service;

import com.attendance.system.dto.response.DashboardResponse;
import com.attendance.system.model.Conge;
import com.attendance.system.model.Pointage;
import com.attendance.system.repository.CongeRepository;
import com.attendance.system.repository.PointageRepository;
import com.attendance.system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final UserRepository userRepository;
    private final PointageRepository pointageRepository;
    private final CongeRepository congeRepository;

    public DashboardResponse getDashboard() {
        LocalDate today = LocalDate.now();
        YearMonth currentMonth = YearMonth.now();
        LocalDate debutMois = currentMonth.atDay(1);
        LocalDate finMois = currentMonth.atEndOfMonth();

        // Stats globales
        long totalEmployes = userRepository.count();
        long employesActifs = userRepository.countByActive(true);

        // Stats aujourd'hui
        List<Pointage> pointagesAujourdHui = pointageRepository.findByDate(today);
        long presentAujourdHui = pointagesAujourdHui.stream()
                .filter(p -> p.getHeureEntree() != null)
                .count();

        long retardsAujourdHui = pointagesAujourdHui.stream()
                .filter(Pointage::isEnRetard)
                .count();

        List<Conge> congesAujourdHui = congeRepository.findApprovedCongesOnDate(today);
        long enCongeAujourdHui = congesAujourdHui.size();

        long absentsAujourdHui = Math.max(0, employesActifs - presentAujourdHui - enCongeAujourdHui);

        // Stats du mois
        List<Pointage> pointagesMois = pointageRepository.findByDateBetween(debutMois, finMois);

        long retardsMois = pointagesMois.stream().filter(Pointage::isEnRetard).count();

        double heuresTravailleesMois = pointagesMois.stream()
                .filter(p -> p.getDureeMinutes() != null)
                .mapToLong(Pointage::getDureeMinutes)
                .sum() / 60.0;

        long congesEnAttente = congeRepository.findByStatut(Conge.StatutConge.EN_ATTENTE).size();

        // Compter absences du mois (jours ouvrés - présences)
        long absencesMois = calculerAbsencesMois(debutMois, finMois, employesActifs, pointagesMois);

        // Stats mensuelles (12 derniers mois)
        List<DashboardResponse.StatMensuelle> statsMensuelles = getStatsMensuelles();

        return DashboardResponse.builder()
                .totalEmployes(totalEmployes)
                .employesActifs(employesActifs)
                .presentAujourdHui(presentAujourdHui)
                .absentsAujourdHui(absentsAujourdHui)
                .retardsAujourdHui(retardsAujourdHui)
                .enCongeAujourdHui(enCongeAujourdHui)
                .retardsMois(retardsMois)
                .absencesMois(absencesMois)
                .heuresTravailleesMois(Math.round(heuresTravailleesMois * 10.0) / 10.0)
                .congesEnAttente(congesEnAttente)
                .statsMensuelles(statsMensuelles)
                .build();
    }

    private long calculerAbsencesMois(LocalDate debut, LocalDate fin,
                                       long employesActifs, List<Pointage> pointages) {
        long joursOuvres = debut.datesUntil(fin.plusDays(1))
                .filter(d -> d.getDayOfWeek().getValue() < 6) // Lun-Ven
                .count();

        long totalPresences = pointages.stream()
                .filter(p -> p.getHeureEntree() != null)
                .count();

        long capaciteMois = joursOuvres * employesActifs;
        return Math.max(0, capaciteMois - totalPresences);
    }

    private List<DashboardResponse.StatMensuelle> getStatsMensuelles() {
        List<DashboardResponse.StatMensuelle> stats = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM");

        for (int i = 11; i >= 0; i--) {
            YearMonth ym = YearMonth.now().minusMonths(i);
            LocalDate debut = ym.atDay(1);
            LocalDate fin = ym.atEndOfMonth();

            List<Pointage> pointages = pointageRepository.findByDateBetween(debut, fin);

            long presences = pointages.stream()
                    .filter(p -> p.getHeureEntree() != null)
                    .count();

            long retards = pointages.stream()
                    .filter(Pointage::isEnRetard)
                    .count();

            double heures = pointages.stream()
                    .filter(p -> p.getDureeMinutes() != null)
                    .mapToLong(Pointage::getDureeMinutes)
                    .sum() / 60.0;

            long joursOuvres = debut.datesUntil(fin.plusDays(1))
                    .filter(d -> d.getDayOfWeek().getValue() < 6)
                    .count();

            long absences = Math.max(0, joursOuvres - presences);

            stats.add(DashboardResponse.StatMensuelle.builder()
                    .mois(ym.format(formatter))
                    .presences(presences)
                    .absences(absences)
                    .retards(retards)
                    .heuresTravaillees(Math.round(heures * 10.0) / 10.0)
                    .build());
        }

        return stats;
    }
}
