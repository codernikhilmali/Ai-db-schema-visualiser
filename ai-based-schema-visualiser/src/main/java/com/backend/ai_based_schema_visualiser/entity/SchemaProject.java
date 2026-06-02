package com.backend.ai_based_schema_visualiser.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "schema_projects", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"project_key", "user_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchemaProject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_key", nullable = false)
    private String projectKey;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Lob
    @Column(name = "json_schema", columnDefinition = "LONGTEXT")
    private String jsonSchema;

    @Lob
    @Column(name = "sql_schema", columnDefinition = "LONGTEXT")
    private String sqlSchema;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
