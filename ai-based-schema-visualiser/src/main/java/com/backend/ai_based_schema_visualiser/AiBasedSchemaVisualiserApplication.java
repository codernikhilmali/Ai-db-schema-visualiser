package com.backend.ai_based_schema_visualiser;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AiBasedSchemaVisualiserApplication {

	public static void main(String[] args) {
		// Programmatically load .env file variables into System Properties for Spring Boot
		try {
			java.io.File envFile = null;
			java.io.File direct = new java.io.File(".env");
			if (direct.exists()) {
				envFile = direct;
			} else {
				java.io.File sub = new java.io.File("ai-based-schema-visualiser/.env");
				if (sub.exists()) {
					envFile = sub;
				} else {
					// Climb directory tree to find .env or ai-based-schema-visualiser/.env
					java.io.File currentDir = new java.io.File(".").getAbsoluteFile();
					while (currentDir != null) {
						java.io.File test = new java.io.File(currentDir, ".env");
						if (test.exists()) {
							envFile = test;
							break;
						}
						java.io.File testSub = new java.io.File(currentDir, "ai-based-schema-visualiser/.env");
						if (testSub.exists()) {
							envFile = testSub;
							break;
						}
						currentDir = currentDir.getParentFile();
					}
				}
			}

			if (envFile != null && envFile.exists()) {
				java.nio.file.Files.lines(envFile.toPath()).forEach(line -> {
					String trimmed = line.trim();
					if (trimmed.isEmpty() || trimmed.startsWith("#") || !trimmed.contains("=")) {
						return;
					}
					int delimiterIdx = trimmed.indexOf("=");
					String key = trimmed.substring(0, delimiterIdx).trim();
					String value = trimmed.substring(delimiterIdx + 1).trim();
					System.setProperty(key, value);
				});
				System.out.println("✅ Programmatically loaded environment variables from: " + envFile.getAbsolutePath());
			} else {
				System.out.println("ℹ️ No .env file found in root or parent paths. Using default System/Spring environment variables.");
			}
		} catch (Exception e) {
			System.err.println("⚠️ Warning: Failed to load .env file programmatically: " + e.getMessage());
		}

		SpringApplication.run(AiBasedSchemaVisualiserApplication.class, args);
	}

}
