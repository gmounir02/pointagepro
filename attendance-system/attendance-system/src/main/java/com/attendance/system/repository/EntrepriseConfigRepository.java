package com.attendance.system.repository;

import com.attendance.system.model.EntrepriseConfig;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EntrepriseConfigRepository extends MongoRepository<EntrepriseConfig, String> {
    // Il n'y aura qu'un seul document de config
    Optional<EntrepriseConfig> findFirstBy();
}
