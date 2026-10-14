-- Trip name: the name the student gives the trip with the pencil next to
-- "Trip to ..." in the Trip Plan Builder. Empty = "Trip to <destination>".
-- (The existing `title` column stays the name of the "Where to go" list.)
-- Run once on the wanderwise database.

ALTER TABLE `trips`
  ADD COLUMN `trip_name` VARCHAR(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `title`;
