package com.attendance.system.utils;

import org.springframework.stereotype.Component;

@Component
public class GpsUtils {

    private static final double EARTH_RADIUS_KM = 6371.0;

    /**
     * Calcule la distance entre deux points GPS (formule de Haversine)
     * @return distance en mètres
     */
    public static double calculerDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distanceKm = EARTH_RADIUS_KM * c;

        return distanceKm * 1000; // Convertir en mètres
    }

    /**
     * Vérifie si un point est dans le rayon autorisé
     */
    public static boolean estDansLeRayon(
            double userLat, double userLon,
            double entrepriseLat, double entrepriseLon,
            int rayonMetres) {
        double distance = calculerDistance(userLat, userLon, entrepriseLat, entrepriseLon);
        return distance <= rayonMetres;
    }
}
