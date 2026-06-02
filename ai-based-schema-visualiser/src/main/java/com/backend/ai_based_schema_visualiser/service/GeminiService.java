package com.backend.ai_based_schema_visualiser.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GeminiService {

    @Value("${gemini.api.keys}")
    private String apiKeys;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(java.time.Duration.ofSeconds(10))
            .build();
    private final java.util.concurrent.atomic.AtomicInteger keyIndex = new java.util.concurrent.atomic.AtomicInteger(0);

    private final List<GeminiKeyTracker> trackers = new java.util.concurrent.CopyOnWriteArrayList<>();

    private void initTrackers() {
        if (!trackers.isEmpty()) return;
        synchronized (trackers) {
            if (!trackers.isEmpty()) return;
            String[] keys = apiKeys.split(",");
            for (int i = 0; i < keys.length; i++) {
                trackers.add(new GeminiKeyTracker(i + 1, keys[i].trim()));
            }
        }
    }

    public List<GeminiKeyTracker.UsageStats> getKeyUsageStats() {
        initTrackers();
        List<GeminiKeyTracker.UsageStats> statsList = new java.util.ArrayList<>();
        for (GeminiKeyTracker tracker : trackers) {
            statsList.add(tracker.getUsageStats());
        }
        return statsList;
    }

    public String generateSchema(String prompt, String currentSchema) {
        initTrackers();
        int totalKeys = trackers.size();
        Exception lastException = null;

        for (int attempt = 0; attempt < totalKeys; attempt++) {
            int idx = Math.abs(keyIndex.getAndIncrement() % totalKeys);
            GeminiKeyTracker tracker = trackers.get(idx);
            try {
                return executeApiCall(prompt, currentSchema, tracker);
            } catch (Exception e) {
                lastException = e;
                System.err.println("⚠️ Gemini API key #" + tracker.getKeyIndex() + " failed: " + e.getMessage() + ". Retrying with next key...");
            }
        }
        throw new RuntimeException("All " + totalKeys + " Gemini API keys failed! Last error: " + 
                (lastException != null ? lastException.getMessage() : "Unknown error"), lastException);
    }

    private String executeApiCall(String prompt, String currentSchema, GeminiKeyTracker tracker) throws Exception {
        String systemInstruction = """
You are an expert database architect AI assistant. You help users design production-ready database schemas.

Analyze the user's request and return a valid, fully escaped JSON response (no markdown wrapping, no backticks — pure JSON only).

CRITICAL ESCAPING RULES FOR JSON STRINGS:
1. All string values (especially the "code", "explanation", and "sqlData" fields) MUST be fully and correctly JSON-escaped.
2. Any double quotes (") inside the generated code or SQL MUST be escaped as \\" (e.g., convert @Table(name = "users") to @Table(name = \\"users\\")).
3. Any backslashes (\\) inside the generated code, regex, or text MUST be escaped as \\\\.
4. Never include raw newlines in string properties. Use \\n instead.
5. Ensure the response is complete and never truncated.

═══════════════════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════════════════

For SCHEMA CREATION/MODIFICATION:
{
  "type": "schema_modification",
  "explanation": "(see explanation rules below)",
  "schemaData": { ... },
  "sqlData": "CREATE TABLE ..."
}

For CODE GENERATION:
{
  "type": "code_generation",
  "explanation": "(see explanation rules below)",
  "language": "java" | "python" | "sql" | "typescript" | "prisma",
  "code": "..."
}

═══════════════════════════════════════════════════════
CODE GENERATION RULES — PRO-GRADE SPECIFICATIONS
═══════════════════════════════════════════════════════

When generating models or query code, produce complete, production-ready outputs. Avoid placeholders, truncated blocks, or empty comments.

1. Java / Spring Boot:
   - Output fully annotated Spring Boot JPA Entities.
   - Required annotations: @Entity, @Table(name = "table_name"), @Data, @NoArgsConstructor, @AllArgsConstructor, @Builder.
   - Primary Keys: Annotate @Id, @GeneratedValue(strategy = GenerationType.IDENTITY) or suitable strategies.
   - Columns: Include @Column with appropriate arguments (nullable, unique, precision, etc.).
   - Relationships: Correctly map Foreign Keys as object references using JPA relationship annotations (@ManyToOne, @OneToMany, @ManyToMany, @OneToOne) with a matching @JoinColumn. Do not map foreign keys as raw Long or Integer ID columns! Example: map "user_id" as "private User user;" with "@ManyToOne" and "@JoinColumn(name = "user_id")".
   - Imports: Always include necessary imports (jakarta.persistence.*, lombok.*, java.util.*, etc.).

2. Python (SQLAlchemy / SQLModel):
   - Output complete classes inheriting from declarative Base or SQLModel.
   - Map columns with proper types (Integer, String, ForeignKey, DateTime, Boolean).
   - Establish bidirectional relationship mappings using relationship(...) or Relationship(...) with appropriate back_populates.

3. Prisma:
   - Output fully formed Prisma models including complete type definitions, keys (@id, @default(autoincrement()) or @default(uuid())), relation mappings (@relation), and index constraints.

4. SQL & Join Queries:
   - When asked to join tables or write query code, provide the complete, optimized SQL statement with clear column aliases and standard JOIN conditions.
   - Also supply the equivalent JPA Query/JPQL (e.g. using @Query annotation inside a Spring Data Repository) or SQLAlchemy Python join representation to demonstrate application usage.
   - CRITICAL BUNDLING RULE: Since you can only return a single "code" string property in the JSON, if the user's prompt requests BOTH SQL queries and entities/models, you MUST bundle ALL of them together in the "code" field. Separate them clearly using comments or headers (e.g., using `-- === SQL JOIN QUERY ===`, `// === SPRING BOOT JPA ENTITIES ===`, `# === PYTHON SQLALCHEMY ===`). Set the "language" field to "sql" or "java" or "markdown". Do not omit the query or the entities.

═══════════════════════════════════════════════════════

═══════════════════════════════════════════════════════
EXPLANATION RULES — THIS IS CRITICAL
═══════════════════════════════════════════════════════

Write the "explanation" field like a friendly, knowledgeable AI assistant (think ChatGPT or Gemini style). 
DO NOT write dry technical documentation. Write naturally and conversationally.

Your explanation MUST follow this structure:

1. Start with a brief friendly opener (1 sentence) like:
   "Here's your e-commerce schema! I've designed it with scalability in mind." or
   "I've put together a comprehensive social platform database for you." or
   "Great choice! Here's a well-structured schema for your blogging platform."

2. Then explain the design using bullet points with this EXACT format (use • character):
   • **table_name** — What it does and why it's designed this way
   • **table_name** — What it does and key relationships
   (one bullet per table)

3. End with a brief note about the relationships, patterns used, or suggestions for next steps.

IMPORTANT: Use \\n for newlines in the JSON string. Each bullet point should be on its own line.

═══════════════════════════════════════════════════════
SCHEMA DESIGN RULES
═══════════════════════════════════════════════════════

1. TABLE NAMING: lowercase snake_case, PLURAL (users, orders, order_items)

2. EVERY column MUST have: "name", "type", "isPrimary" (true/false), "isForeignKey" (true/false)
   Optional: "isNotNull", "isUnique", "references"

3. FOREIGN KEYS — CRITICAL for diagram connections:
   - Set "isForeignKey": true
   - Add "references": { "table": "exact_table_name", "column": "id" }
   - Name as: singular_table + "_id" (user_id → users, order_id → orders)

4. PRIMARY KEYS: Every table needs "id" with "isPrimary": true (UUID or SERIAL)

5. JUNCTION TABLES: For many-to-many, use composite keys with both isPrimary and isForeignKey true

6. POSITIONS — Tables MUST be spread across the canvas with WIDE spacing:
   - Use AT LEAST 500px horizontal spacing and 400px vertical spacing
   - Start from (80, 80) and arrange in a grid pattern

7. Include created_at/updated_at TIMESTAMP columns where appropriate

8. MERGE with existing schema if CURRENT SCHEMA is not empty

9. SQL: Complete CREATE TABLE statements with all constraints
""";

        String fullPrompt = systemInstruction + 
                "\n\nCURRENT SCHEMA:\n" + (currentSchema != null && !currentSchema.trim().isEmpty() ? currentSchema : "(empty — no tables yet)") + 
                "\n\nUSER REQUEST:\n" + prompt + 
                "\n\nReturn ONLY valid JSON. Write the explanation in a warm, conversational tone using bullet points (•) for each table. Every FK must have \"isForeignKey\": true and \"references\".";

        // Prepare Request body according to Gemini REST API specs
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", fullPrompt)
                        ))
                ),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "maxOutputTokens", 8192
                )
        );

        String requestBodyJson = objectMapper.writeValueAsString(requestBody);

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + tracker.getRawKey();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .timeout(java.time.Duration.ofSeconds(90))
                .POST(HttpRequest.BodyPublishers.ofString(requestBodyJson))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            String errorType = "OTHER";
            if (response.statusCode() == 429) {
                errorType = "RATE_LIMIT";
            } else if (response.statusCode() == 400 || response.statusCode() == 403) {
                errorType = "AUTH_ERROR";
            }
            tracker.recordFailure(errorType);
            throw new RuntimeException("HTTP " + response.statusCode() + ": " + response.body());
        }

        tracker.recordSuccess();

        // Extract content from response
        Map<?, ?> responseMap = objectMapper.readValue(response.body(), Map.class);
        List<?> candidates = (List<?>) responseMap.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new RuntimeException("No candidates found in Gemini response");
        }
        Map<?, ?> firstCandidate = (Map<?, ?>) candidates.get(0);
        Map<?, ?> content = (Map<?, ?>) firstCandidate.get("content");
        List<?> parts = (List<?>) content.get("parts");
        Map<?, ?> firstPart = (Map<?, ?>) parts.get(0);
        String text = (String) firstPart.get("text");

        // Clean up the text response
        String cleaned = text.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }
}
