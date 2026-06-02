package com.backend.ai_based_schema_visualiser.service;

import com.backend.ai_based_schema_visualiser.dtos.ProjectDTO;
import com.backend.ai_based_schema_visualiser.entity.SchemaProject;
import com.backend.ai_based_schema_visualiser.entity.User;
import com.backend.ai_based_schema_visualiser.repository.SchemaProjectRepository;
import com.backend.ai_based_schema_visualiser.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SchemaProjectService {

    private final SchemaProjectRepository projectRepository;
    private final UserRepository userRepository;

    public List<ProjectDTO> getProjectsForUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        return projectRepository.findByUserOrderByUpdatedAtDesc(user)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProjectDTO saveProject(String email, ProjectDTO dto) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        SchemaProject project = projectRepository.findByUserAndProjectKey(user, dto.getProjectKey())
                .orElse(SchemaProject.builder()
                        .projectKey(dto.getProjectKey())
                        .user(user)
                        .build());

        project.setName(dto.getName());
        project.setDescription(dto.getDescription());
        project.setJsonSchema(dto.getJsonSchema());
        project.setSqlSchema(dto.getSqlSchema());

        SchemaProject saved = projectRepository.save(project);
        return toDTO(saved);
    }

    @Transactional
    public void deleteProject(String email, String projectKey) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        projectRepository.deleteByUserAndProjectKey(user, projectKey);
    }

    private ProjectDTO toDTO(SchemaProject entity) {
        return ProjectDTO.builder()
                .projectKey(entity.getProjectKey())
                .name(entity.getName())
                .description(entity.getDescription())
                .jsonSchema(entity.getJsonSchema())
                .sqlSchema(entity.getSqlSchema())
                .build();
    }
}
