import React from "react";

// Small round profile picture used on Guides cards and the stories list.
// Falls back to the person's initials when they have no picture.
export default function JournalAvatar({ author, size = 36, onClick, title }) {
  const name = [author?.firstName, author?.lastName].filter(Boolean).join(" ");
  const initials =
    [author?.firstName, author?.lastName]
      .filter(Boolean)
      .map((s) => s.trim()[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <span
      className="ww-journal-avatar"
      title={title || name}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        cursor: onClick ? "pointer" : "default",
        backgroundImage: author?.avatarUrl ? `url(${author.avatarUrl})` : undefined,
      }}
    >
      {!author?.avatarUrl && initials}
    </span>
  );
}