package com.attendance.system.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {

    // Statistiques générales
    private long totalEmployes;
    private long employesActifs;
    private long presentAujourdHui;
    private long absentsAujourdHui;
    private long retardsAujourdHui;
    private long enCongeAujourdHui;

    // Stats du mois
    private long retardsMois;
    private long absencesMois;
    private double heuresTravailleesMois;
    private long congesEnAttente;

    // Stats mensuelles (12 derniers mois)
    private List<StatMensuelle> statsMensuelles;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatMensuelle {
        private String mois;       // "2024-01"
        private long presences;
        private long absences;
        private long retards;
        private double heuresTravaillees;
    }
}
