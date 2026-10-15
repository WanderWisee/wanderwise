-- Push notifications for the mobile app (Android APK).
-- One row per phone (Expo push token). Run once on the database
-- (local MySQL and the Railway MySQL) before using the new backend.
CREATE TABLE IF NOT EXISTS `push_tokens` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `token` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `platform` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_push_tokens_token` (`token`),
  KEY `ix_push_tokens_user` (`user_id`),
  CONSTRAINT `fk_push_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
