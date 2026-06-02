package com.backend.ai_based_schema_visualiser.controller;

import com.backend.ai_based_schema_visualiser.dtos.ProjectDTO;
import com.backend.ai_based_schema_visualiser.service.SchemaProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final SchemaProjectService projectService;

    @GetMapping
    public ResponseEntity<List<ProjectDTO>> getProjects(Authentication authentication) {
        String email = authentication.getName();
        List<ProjectDTO> projects = projectService.getProjectsForUser(email);
        return ResponseEntity.ok(projects);
    }

    @PutMapping
    public ResponseEntity<ProjectDTO> saveProject(
            Authentication authentication,
            @RequestBody ProjectDTO dto
    ) {
        String email = authentication.getName();
        ProjectDTO saved = projectService.saveProject(email, dto);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{projectKey}")
    public ResponseEntity<Void> deleteProject(
            Authentication authentication,
            @PathVariable String projectKey
    ) {
        String email = authentication.getName();
        projectService.deleteProject(email, projectKey);
        return ResponseEntity.noContent().build();
    }
}
