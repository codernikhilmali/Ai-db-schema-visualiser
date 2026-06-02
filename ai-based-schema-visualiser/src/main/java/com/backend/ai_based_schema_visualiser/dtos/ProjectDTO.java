package com.backend.ai_based_schema_visualiser.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectDTO {
    private String projectKey;
    private String name;
    private String description;
    private String jsonSchema;
    private String sqlSchema;
}
