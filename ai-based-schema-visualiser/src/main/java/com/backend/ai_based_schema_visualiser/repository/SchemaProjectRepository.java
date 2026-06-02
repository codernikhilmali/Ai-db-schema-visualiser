package com.backend.ai_based_schema_visualiser.repository;

import com.backend.ai_based_schema_visualiser.entity.SchemaProject;
import com.backend.ai_based_schema_visualiser.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SchemaProjectRepository extends JpaRepository<SchemaProject, Long> {
    List<SchemaProject> findByUserOrderByUpdatedAtDesc(User user);
    Optional<SchemaProject> findByUserAndProjectKey(User user, String projectKey);
    void deleteByUserAndProjectKey(User user, String projectKey);
}
