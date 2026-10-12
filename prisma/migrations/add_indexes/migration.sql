-- Add indexes for common queries

-- User indexes
CREATE INDEX IF NOT EXISTS idx_user_created_at ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS idx_user_region ON "User"("region");
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"("email");
CREATE INDEX IF NOT EXISTS idx_user_trust_score ON "User"("trustScore");

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_message_sender_id ON "Message"("senderId");
CREATE INDEX IF NOT EXISTS idx_message_receiver_id ON "Message"("receiverId");
CREATE INDEX IF NOT EXISTS idx_message_created_at ON "Message"("createdAt");
CREATE INDEX IF NOT EXISTS idx_message_conversation ON "Message"("senderId", "receiverId", "createdAt");

-- Report indexes
CREATE INDEX IF NOT EXISTS idx_report_status ON "Report"("status");
CREATE INDEX IF NOT EXISTS idx_report_created_at ON "Report"("createdAt");
CREATE INDEX IF NOT EXISTS idx_report_reported_user ON "Report"("reportedUserId");

-- Badge indexes
CREATE INDEX IF NOT EXISTS idx_badge_user_id ON "Badge"("userId");
CREATE INDEX IF NOT EXISTS idx_badge_unlocked_at ON "Badge"("unlockedAt");

-- Achievement indexes
CREATE INDEX IF NOT EXISTS idx_achievement_user_id ON "Achievement"("userId");
CREATE INDEX IF NOT EXISTS idx_achievement_unlocked_at ON "Achievement"("unlockedAt");

-- Match indexes
CREATE INDEX IF NOT EXISTS idx_match_user_id ON "Match"("userId");
CREATE INDEX IF NOT EXISTS idx_match_matched_user_id ON "Match"("matchedUserId");
CREATE INDEX IF NOT EXISTS idx_match_created_at ON "Match"("createdAt");
CREATE INDEX IF NOT EXISTS idx_match_status ON "Match"("status");
