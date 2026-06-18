package com.attendance.system.repository;

import com.attendance.system.model.Pointage;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PointageRepository extends MongoRepository<Pointage, String> {

    List<Pointage> findByUserId(String userId);

    List<Pointage> findByDate(LocalDate date);

    List<Pointage> findByUserIdAndDate(String userId, LocalDate date);

    @Query("{ 'userId': ?0, 'date': { $gte: ?1, $lte: ?2 } }")
    List<Pointage> findByUserIdAndDateBetween(String userId, LocalDate debut, LocalDate fin);

    @Query("{ 'date': { $gte: ?0, $lte: ?1 } }")
    List<Pointage> findByDateBetween(LocalDate debut, LocalDate fin);

    Optional<Pointage> findByUserIdAndDateAndType(String userId, LocalDate date, Pointage.TypePointage type);

    long countByEnRetardTrueAndDateBetween(LocalDate debut, LocalDate fin);

    long countByDate(LocalDate date);

    // Pointages avec entrée mais sans sortie (encore présents)
    @Query("{ 'heureEntree': { $ne: null }, 'heureSortie': null, 'date': ?0 }")
    List<Pointage> findPresentEmployesByDate(LocalDate date);

    List<Pointage> findByStatutJustification(String statutJustification);
}
