-- Additive alignment with the existing backend models.
-- Run through apply_schema_update.py, which skips columns already present
-- and makes an ignored local backup before changing the database.

ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'student';
ALTER TABLE users ADD COLUMN account_status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE trip_members ADD COLUMN can_edit TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE journal_entries ADD COLUMN is_hidden TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE journal_entries ADD COLUMN hidden_reason TEXT NULL;
ALTER TABLE journal_entries ADD COLUMN hidden_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS classes (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  section VARCHAR(100) NULL,
  term VARCHAR(100) NULL,
  join_code VARCHAR(12) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_classes_join_code (join_code),
  CONSTRAINT fk_classes_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE trips ADD COLUMN class_id INT NULL;

CREATE TABLE IF NOT EXISTS class_members (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  student_id INT NOT NULL,
  joined_at DATETIME NOT NULL,
  UNIQUE KEY uq_class_student (class_id, student_id),
  CONSTRAINT fk_class_members_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_class_members_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_announcements (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  author_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_class_announcements_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_class_announcements_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  details LONGTEXT NULL,
  ip_address VARCHAR(100) NULL,
  created_at DATETIME NOT NULL,
  KEY ix_activity_logs_created (created_at),
  CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trip_day_settings (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  day_date DATE NOT NULL,
  meeting_place_name VARCHAR(200) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  radius_m INT NOT NULL DEFAULT 200,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_trip_day_setting (trip_id, day_date),
  CONSTRAINT fk_day_settings_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trip_attendance (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  day_date DATE NOT NULL,
  user_id INT NOT NULL,
  present TINYINT(1) NOT NULL DEFAULT 0,
  photo LONGTEXT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  distance_m INT NULL,
  checked_in_at DATETIME NULL,
  marked_by INT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_trip_day_attendance (trip_id, day_date, user_id),
  CONSTRAINT fk_attendance_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_marker FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trip_announcements (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_trip_announcements_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_announcements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trip_activities (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  day_date DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  activity_time TIME NULL,
  place_name VARCHAR(200) NULL,
  notes TEXT NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL,
  KEY ix_trip_activities_day (trip_id, day_date),
  CONSTRAINT fk_trip_activities_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_activities_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
