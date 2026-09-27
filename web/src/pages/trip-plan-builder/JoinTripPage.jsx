import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";

// What an invite link (/trip-plan/join/:shareToken) leads to. This page
// itself is never really "seen" — it decides in one step where the person
// actually belongs, then redirects:
//   - logged in  -> call the join API, then go straight into the trip
//   - not logged in -> fall back to the public, view-only shared trip page
export default function JoinTripPage() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("wanderwise_token");

    if (!token) {
      navigate(`/trip-plan/shared/${shareToken}`, { replace: true });
      return;
    }

    fetch(`/api/trips/join/${shareToken}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((data) => {
        if (data?.tripId) {
          navigate(`/trip-plan?tripId=${data.tripId}`, { replace: true });
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true));
  }, [shareToken, navigate]);

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <p>{error ? t("inviteLinkInvalid") : t("joiningTrip")}</p>
    </div>
  );
}