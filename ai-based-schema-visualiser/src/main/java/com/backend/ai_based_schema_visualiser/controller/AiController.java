package com.backend.ai_based_schema_visualiser.controller;

import com.backend.ai_based_schema_visualiser.service.GeminiService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final GeminiService geminiService;

    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestBody AiRequest request) {
        try {
            String result = geminiService.generateSchema(request.getPrompt(), request.getCurrentSchema());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.err.println("❌ AI Schema generation failed: " + e.getMessage());
            return ResponseEntity.status(500).body(java.util.Map.of(
                "error", "AI Schema generation failed: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/limits")
    public ResponseEntity<java.util.List<com.backend.ai_based_schema_visualiser.service.GeminiKeyTracker.UsageStats>> getLimits() {
        return ResponseEntity.ok(geminiService.getKeyUsageStats());
    }

    @Data
    public static class AiRequest {
        private String prompt;
        private String currentSchema;
    }
}
