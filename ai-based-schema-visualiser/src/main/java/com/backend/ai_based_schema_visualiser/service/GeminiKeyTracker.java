package com.backend.ai_based_schema_visualiser.service;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class GeminiKeyTracker {
    private final int keyIndex;
    private final String rawKey;
    private final String maskedKey;
    private String status = "ACTIVE"; // ACTIVE, RATE_LIMITED, INVALID
    private final List<Long> requestTimestamps = new ArrayList<>();
    private int consecutiveErrors = 0;
    private LocalDateTime lastUsedAt;

    public GeminiKeyTracker(int keyIndex, String rawKey) {
        this.keyIndex = keyIndex;
        this.rawKey = rawKey;
        this.maskedKey = maskKey(rawKey);
    }

    private String maskKey(String key) {
        if (key == null || key.length() < 12) return "InvalidKey";
        return key.substring(0, 6) + "..." + key.substring(key.length() - 5);
    }

    public synchronized void recordSuccess() {
        this.status = "ACTIVE";
        this.consecutiveErrors = 0;
        this.lastUsedAt = LocalDateTime.now();
        this.requestTimestamps.add(System.currentTimeMillis());
    }

    public synchronized void recordFailure(String errorType) {
        this.consecutiveErrors++;
        this.lastUsedAt = LocalDateTime.now();
        if ("RATE_LIMIT".equals(errorType)) {
            this.status = "RATE_LIMITED";
        } else if ("AUTH_ERROR".equals(errorType)) {
            this.status = "INVALID";
        }
    }

    public synchronized UsageStats getUsageStats() {
        long now = System.currentTimeMillis();
        long oneMinuteAgo = now - 60_000L;
        long oneDayAgo = now - 86_400_000L;

        // Clean up old timestamps
        requestTimestamps.removeIf(t -> t < oneDayAgo);

        int rpmUsed = (int) requestTimestamps.stream().filter(t -> t >= oneMinuteAgo).count();
        int rpdUsed = requestTimestamps.size();

        return new UsageStats(
            keyIndex,
            maskedKey,
            status,
            rpmUsed,
            Math.max(0, 15 - rpmUsed),
            rpdUsed,
            Math.max(0, 1500 - rpdUsed),
            lastUsedAt != null ? lastUsedAt.toString() : "NEVER",
            consecutiveErrors
        );
    }

    @Data
    public static class UsageStats {
        private final int keyIndex;
        private final String maskedKey;
        private final String status;
        private final int requestsPerMinuteUsed;
        private final int requestsPerMinuteRemaining;
        private final int requestsPerDayUsed;
        private final int requestsPerDayRemaining;
        private final String lastUsed;
        private final int consecutiveErrors;
    }
}
