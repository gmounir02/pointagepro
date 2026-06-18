package com.attendance.system.repository;

import com.attendance.system.model.Conge;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface CongeRepository extends MongoRepository<Conge, String> {

    List<Conge> findByUserId(String userId);

    List<Conge> findByStatut(Conge.StatutConge statut);

    List<Conge> findByUserIdAndStatut(String userId, Conge.StatutConge statut);

    @Query("{ 'userId': ?0, 'dateDebut': { $lte: ?1 }, 'dateFin': { $gte: ?1 } }")
    List<Conge> findActiveCongeForUserOnDate(String userId, LocalDate date);

    @Query("{ 'statut': 'APPROUVE', 'dateDebut': { $lte: ?0 }, 'dateFin': { $gte: ?0 } }")
    List<Conge> findApprovedCongesOnDate(LocalDate date);
}
