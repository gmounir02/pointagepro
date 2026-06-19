package com.attendance.system.dto.request;

import com.attendance.system.model.Pointage;
import lombok.Data;

@Data
public class PointageUpdateRequest {
    private String userId;
    private String heureEntree; // Format ISO string e.g. "2026-06-19T08:30:00"
    private String heureSortie; // Format ISO string e.g. "2026-06-19T17:30:00"
    private Pointage.TypePointage type;
    private String note;
}

