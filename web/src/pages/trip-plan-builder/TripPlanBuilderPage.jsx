import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import TripMap from "../../components/TripMap";
import { useLanguage } from "../../context/LanguageContext";
import { usePreferences } from "../../context/PreferencesContext";
import "../../App.css";

let nextPlaceId = 1;
let nextSectionId = 1;
let nextNumber = 1;

function formatDayLabel(date) {
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${weekday}, ${month} ${day}${suffix}`;
}

function buildDaysFromRange(startDate, endDate) {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || start > end) return [];
  const days = [];
  const current = new Date(start);
  while (current <= end) {
    days.push({ label: formatDayLabel(current), placeIds: [] });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function addDaysIso(startDateStr, daysToAdd) {
  if (!startDateStr) return null;
  const d = new Date(startDateStr + "T00:00:00");
  d.setDate(d.getDate() + daysToAdd);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ===== Smart Route Optimization helpers =====
// Total length of visiting the points in `order`, one after another,
// using a distance matrix (meters) from OSRM's /table service. An
// unreachable pair (null) counts as huge so it's never picked.
function pathLength(order, matrix) {
  let total = 0;
  for (let i = 0; i < order.length - 1; i++) {
    const d = matrix[order[i]][order[i + 1]];
    total += d == null ? 1e9 : d;
  }
  return total;
}

// Shortest one-way path that starts at point 0 (the day's first place
// stays first — usually where the students start, e.g. their hotel) and
// visits every other point once. Tries every order when there are few
// places (exact answer); for bigger days, uses nearest-neighbour then
// 2-opt swaps, which is close to optimal and still instant.
function bestOpenPath(matrix) {
  const n = matrix.length;
  const rest = Array.from({ length: n - 1 }, (_, i) => i + 1);

  if (n <= 8) {
    let best = null;
    let bestLen = Infinity;
    const permute = (arr, l) => {
      if (l === arr.length) {
        const order = [0, ...arr];
        const len = pathLength(order, matrix);
        if (len < bestLen) {
          bestLen = len;
          best = order;
        }
        return;
      }
      for (let i = l; i < arr.length; i++) {
        [arr[l], arr[i]] = [arr[i], arr[l]];
        permute(arr, l + 1);
        [arr[l], arr[i]] = [arr[i], arr[l]];
      }
    };
    permute(rest, 0);
    return best;
  }

  const order = [0];
  const left = new Set(rest);
  while (left.size > 0) {
    const last = order[order.length - 1];
    let next = null;
    let nextDist = Infinity;
    left.forEach((j) => {
      const d = matrix[last][j] == null ? 1e9 : matrix[last][j];
      if (d < nextDist) {
        nextDist = d;
        next = j;
      }
    });
    order.push(next);
    left.delete(next);
  }

  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < order.length - 1; i++) {
      for (let k = i + 1; k < order.length; k++) {
        const candidate = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)];
        if (pathLength(candidate, matrix) < pathLength(order, matrix)) {
          order.splice(0, order.length, ...candidate);
          improved = true;
        }
      }
    }
  }
  return order;
}

function buildItineraryDateMap(days, startDate) {
  const map = {};
  days.forEach((day, i) => {
    const iso = addDaysIso(startDate, i);
    day.placeIds.forEach((id) => {
      map[id] = iso;
    });
  });
  return map;
}

// Position of each place WITHIN its itinerary day (0, 1, 2…). Saved as
// itineraryOrder so a drag-and-drop or "Optimize route" reorder survives
// a refresh — before this, only the date was saved, and the day's order
// was rebuilt from the "Where to go?" list order on every load.
function buildItineraryOrderMap(days) {
  const map = {};
  days.forEach((day) => {
    day.placeIds.forEach((id, idx) => {
      map[id] = idx;
    });
  });
  return map;
}

function serializePlace(p, itineraryDateMap, sortOrder, itineraryOrderMap = {}) {
  return {
    name: p.name,
    itineraryDate: itineraryDateMap[p.id] || null,
    itineraryOrder: itineraryDateMap[p.id] && p.id in itineraryOrderMap ? itineraryOrderMap[p.id] : null,
    latitude: typeof p.lat === "number" ? p.lat : null,
    longitude: typeof p.lng === "number" ? p.lng : null,
    notes: p.note || null,
    scheduledTime: p.time || null,
    visited: !!p.visited,
    sortOrder,
    costs: (p.costs || []).map((c) => ({ category: c.category, amount: Number(c.amount) || 0 })),
  };
}

function buildSaveRequest({ destination, startDate, endDate, people, whereToGoTitle, tripState }) {
  const itineraryDateMap = buildItineraryDateMap(tripState.days, startDate);
  const itineraryOrderMap = buildItineraryOrderMap(tripState.days);

  const sections = [
    {
      isDefault: true,
      name: whereToGoTitle,
      sortOrder: 0,
      places: tripState.places.map((p, i) => serializePlace(p, itineraryDateMap, i, itineraryOrderMap)),
    },
    ...tripState.customSections.map((s, idx) => ({
      isDefault: false,
      name: s.name || null,
      sortOrder: idx + 1,
      places: s.places.map((p, i) => serializePlace(p, itineraryDateMap, i, itineraryOrderMap)),
    })),
  ];

  return {
    title: whereToGoTitle,
    destination,
    startDate: startDate || null,
    endDate: endDate || null,
    travelBuddiesCount: people,
    budgetTotal: Number(tripState.budgetTotal) || 0,
    sections,
  };
}

function hydratePlace(p) {
  return {
    id: p.id,
    number: 0,
    name: p.name,
    visited: !!p.visited,
    note: p.notes || "",
    time: p.scheduledTime || "",
    lat: p.latitude,
    lng: p.longitude,
    costs: (p.costs || []).map((c) => ({ id: c.id, category: c.category, amount: c.amount })),
    _itineraryDate: p.itineraryDate,
    _itineraryOrder: p.itineraryOrder ?? null,
  };
}

function hydrateTripState(tripResponse, defaultTitle) {
  const defaultSection = tripResponse.sections.find((s) => s.isDefault);
  const customSectionsResp = tripResponse.sections.filter((s) => !s.isDefault);

  const places = (defaultSection?.places || []).map(hydratePlace);

  const customSections =
    customSectionsResp.length > 0
      ? customSectionsResp.map((s) => ({
          id: nextSectionId++,
          name: s.name || "",
          placeInput: "",
          places: s.places.map(hydratePlace),
        }))
      : [{ id: nextSectionId++, name: "", placeInput: "", places: [] }];

  places.forEach((p, i) => (p.number = i + 1));
  customSections.forEach((s) => s.places.forEach((p, i) => (p.number = i + 1)));

  let maxId = 0;
  let maxNumber = 0;
  [...places, ...customSections.flatMap((s) => s.places)].forEach((p) => {
    if (p.id > maxId) maxId = p.id;
    if (p.number > maxNumber) maxNumber = p.number;
  });
  nextPlaceId = Math.max(nextPlaceId, maxId + 1);
  nextNumber = Math.max(nextNumber, maxNumber + 1);

  const days = buildDaysFromRange(tripResponse.startDate, tripResponse.endDate);
  const allPlaces = [...places, ...customSections.flatMap((s) => s.places)];
  days.forEach((day, i) => {
    const iso = addDaysIso(tripResponse.startDate, i);
    // Restore the saved within-day order. Places saved before this
    // column existed (null) keep their old list order, after the rest.
    day.placeIds = allPlaces
      .filter((p) => p._itineraryDate === iso)
      .map((p, listIdx) => ({ p, listIdx }))
      .sort((a, b) => {
        const ao = a.p._itineraryOrder ?? Number.MAX_SAFE_INTEGER;
        const bo = b.p._itineraryOrder ?? Number.MAX_SAFE_INTEGER;
        return ao !== bo ? ao - bo : a.listIdx - b.listIdx;
      })
      .map(({ p }) => p.id);
  });

  return {
    places,
    customSections,
    days,
    budgetTotal: tripResponse.budgetTotal || 0,
    expenses: [],
  };
}

// Standalone "Add Expense" entries are a separate concept from the small
// per-place cost breakdown — they live in their own `expenses` table on the
// backend, keyed by category and/or a specific place. This turns a raw
// backend expense record into the shape the UI already expects
// (label/icon/dayLabel), same look as before but now actually persisted.
const EXPENSE_CATEGORIES = [
  { icon: "🍽️", label: "Food and Drinks" },
  { icon: "🚌", label: "Transit" },
  { icon: "🎟️", label: "Activities" },
  { icon: "🛍️", label: "Shopping" },
  { icon: "🚗", label: "Car Rental" },
  { icon: "🛏️", label: "Lodging" },
  { icon: "⛽", label: "Gas" },
  { icon: "✈️", label: "Flights" },
];

function findPlaceNameById(tripStateLike, placeId) {
  const all = [...tripStateLike.places, ...tripStateLike.customSections.flatMap((s) => s.places)];
  const found = all.find((p) => p.id === placeId);
  return found ? found.name : null;
}

function findDayLabelForPlace(tripStateLike, placeId) {
  const day = tripStateLike.days.find((d) => d.placeIds.includes(placeId));
  return day ? day.label : null;
}

function mapExpenseFromApi(e, tripStateLike) {
  const placeName = e.placeId ? findPlaceNameById(tripStateLike, e.placeId) : null;
  const categoryMatch = EXPENSE_CATEGORIES.find((c) => c.label === e.category);
  return {
    id: e.id,
    amount: e.amount,
    label: placeName || e.category || "Expense",
    icon: categoryMatch ? categoryMatch.icon : placeName ? "📍" : "💰",
    description: e.description || "",
    dayLabel: e.placeId ? findDayLabelForPlace(tripStateLike, e.placeId) : null,
    placeId: e.placeId || null,
    category: e.category,
  };
}

const COST_CATEGORIES = ["Transportation", "Entrance Fee", "Food", "Hotel", "Other"];
const COST_CATEGORY_KEYS = {
  "Transportation": "costCatTransportation",
  "Entrance Fee": "costCatEntranceFee",
  "Food": "costCatFood",
  "Hotel": "costCatHotel",
  "Other": "costCatOther",
};

export default function TripPlanBuilderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const tripInfo = location.state || {};
  const { t } = useLanguage();
  // Date/time/distance formats from Settings → Formatting.
  const { formatDateRange, formatTime, formatDistance } = usePreferences();

  // The tripId is kept in the URL query string (?tripId=123), NOT only in
  // location.state, because a browser refresh (F5) can lose/never had the
  // tripId in location.state (it's only set here AFTER the trip is created,
  // and the original navigation from Trip Planning never included it).
  // Keeping it in the URL means a refresh always knows which trip to load.
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTripId = searchParams.get("tripId");

  const [tripId, setTripId] = useState(
    urlTripId ? Number(urlTripId) : tripInfo.tripId || null
  );
  const [saveStatus, setSaveStatus] = useState("Saved");
  const saveStatusLabel =
    saveStatus === "Saving..." ? t("savingEllipsis")
    : saveStatus === "Save failed" ? t("saveFailed")
    : t("savedLabel");
  const hasLoadedRef = useRef(false);

  const [destination, setDestination] = useState(tripInfo.destination || "");
  const [destinationCoords, setDestinationCoords] = useState(null);

  // Bookings recorded on the Hotels page for this trip (Booking
  // Synchronization). Only read here, to show them on the matching
  // itinerary days — adding/deleting happens on the Hotels page.
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (!destination.trim()) {
      setDestinationCoords(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const query = encodeURIComponent(`${destination}, Philippines`);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`
        );
        const data = await res.json();
        if (!cancelled && data && data[0]) {
          setDestinationCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        }
      } catch (err) {
        console.warn("Geocoding failed for destination", destination, err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [destination]);

  const [startDate, setStartDate] = useState(tripInfo.startDate || "");
  const [endDate, setEndDate] = useState(tripInfo.endDate || "");
  const [people, setPeople] = useState(tripInfo.people || 0);

  const [whereToGoTitle, setWhereToGoTitle] = useState(t("whereToGoDefault"));
  const [editingWhereToGoTitle, setEditingWhereToGoTitle] = useState(false);

  const [tripState, setTripState] = useState(
    tripInfo.restoredTripState || {
      places: [],
      customSections: [{ id: nextSectionId++, name: "", placeInput: "", places: [] }],
      days: [],
      budgetTotal: 0,
      expenses: [],
    }
  );

  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const applyChange = (updater) => {
    setTripState((prevState) => {
      setPast((p) => [...p, prevState]);
      setFuture([]);
      return typeof updater === "function" ? updater(prevState) : updater;
    });
  };

  const handleUndo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [tripState, ...f]);
    setTripState(previous);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, tripState]);
    setTripState(next);
  };

  const { places, customSections, days, budgetTotal, expenses = [] } = tripState;

  // Load (existing trip) or create (fresh trip) exactly once on mount.
  // Whichever tripId we end up with is written back into the URL so a
  // refresh always re-loads the SAME trip instead of creating a new one.
  //
  // mountEffectStartedRef guards against React StrictMode's dev-mode
  // double-invoke of effects — without it, a single "Let's go" ends up
  // firing the create-trip POST twice, creating two duplicate trips.
  const mountEffectStartedRef = useRef(false);

  useEffect(() => {
    if (mountEffectStartedRef.current) return;
    mountEffectStartedRef.current = true;

    const token = localStorage.getItem("wanderwise_token");
    if (!token) {
      hasLoadedRef.current = true;
      return;
    }

    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const effectiveTripId = urlTripId ? Number(urlTripId) : tripInfo.tripId;

    (async () => {
      try {
        if (effectiveTripId) {
          const resp = await fetch(`/api/trips/${effectiveTripId}`, { headers: authHeaders });
          if (resp.ok) {
            const data = await resp.json();
            setTripId(data.id);
            setDestination(data.destination || "");
            setStartDate(data.startDate || "");
            setEndDate(data.endDate || "");
            setPeople(data.travelBuddiesCount || 0);
            setWhereToGoTitle(data.title || t("whereToGoDefault"));
            const hydrated = hydrateTripState(data);
            setTripState(hydrated);

            if (!urlTripId) {
              setSearchParams({ tripId: String(data.id) }, { replace: true });
            }

            // Mark this trip as viewed for the History page's "Last viewed"
            // column — fire-and-forget, doesn't block the rest of loading.
            fetch(`/api/trips/${data.id}/view`, {
              method: "POST",
              headers: authHeaders,
            }).catch((err) => console.warn("Failed to mark trip as viewed:", err));

            // Standalone "Add Expense" entries live in their own table —
            // load them separately and merge them in.
            try {
              const expResp = await fetch(`/api/trips/${data.id}/expenses`, { headers: authHeaders });
              if (expResp.ok) {
                const expData = await expResp.json();
                // Rows with a placeId are per-place "expected cost" entries
                // (from "$ Add Cost" on an itinerary item) — the backend
                // stores those in this same Expenses table so GetTrip can
                // rebuild each place's cost breakdown, but they already
                // show up on the place itself, so they're excluded here to
                // avoid showing them twice.
                const mappedExpenses = (Array.isArray(expData) ? expData : [])
                  .filter((e) => !e.placeId)
                  .map((e) => mapExpenseFromApi(e, hydrated));
                setTripState((prev) => ({ ...prev, expenses: mappedExpenses }));
              }
            } catch (err) {
              console.warn("Failed to load expenses:", err);
            }

            // Bookings the students made on Agoda/Klook/etc. and recorded
            // here ("Add my booking") — their own table, like expenses.
            try {
              const bookResp = await fetch(`/api/trips/${data.id}/bookings`, { headers: authHeaders });
              if (bookResp.ok) {
                const bookData = await bookResp.json();
                setBookings(Array.isArray(bookData) ? bookData : []);
              }
            } catch (err) {
              console.warn("Failed to load bookings:", err);
            }
          } else {
            // Trip not found / not owned by this user — nothing to hydrate.
            hasLoadedRef.current = true;
          }
        } else if (destination.trim()) {
          const resp = await fetch("/api/trips", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
              title: whereToGoTitle,
              destination,
              startDate: startDate || null,
              endDate: endDate || null,
              travelBuddiesCount: people,
              budgetTotal: 0,
              sections: [],
            }),
          });
          if (resp.ok) {
            const data = await resp.json();
            setTripId(data.tripId);
            setSearchParams({ tripId: String(data.tripId) }, { replace: true });
          }
        }
      } catch (err) {
        console.warn("Failed to load/create trip:", err);
      } finally {
        hasLoadedRef.current = true;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (!hasLoadedRef.current || !tripId) return;

    const token = localStorage.getItem("wanderwise_token");
    if (!token) return;

    setSaveStatus("Saving...");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const body = buildSaveRequest({ destination, startDate, endDate, people, whereToGoTitle, tripState });
        const resp = await fetch(`/api/trips/${tripId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        setSaveStatus(resp.ok ? "Saved" : "Save failed");
      } catch (err) {
        setSaveStatus("Save failed");
      }
    }, 1200);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripState, destination, startDate, endDate, people, whereToGoTitle, tripId]);

  // --- Top-right "⋯" menu (Home / Guides / Profile) ---
  // The "Book a Hotel" button lower on the page already covers Hotels,
  // so it's intentionally left out of this menu.
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const topMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (topMenuRef.current && !topMenuRef.current.contains(e.target)) {
        setTopMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goToTopMenu = (path) => {
    setTopMenuOpen(false);
    navigate(path);
  };

  const [showEditTrip, setShowEditTrip] = useState(false);
  const [editForm, setEditForm] = useState({ destination, startDate, endDate, people });

  // Same Philippine destination autocomplete data as the Trip Planning page.
  const [destinationOptions, setDestinationOptions] = useState([]);

  useEffect(() => {
    fetch("/api/destinations")
      .then((resp) => resp.json())
      .then((data) => setDestinationOptions(Array.isArray(data) ? data : []))
      .catch(() => setDestinationOptions([]));
  }, []);

  const openEditTrip = () => {
    setEditForm({ destination, startDate, endDate, people });
    setShowEditTrip(true);
  };

  const handleSaveTripInfo = async () => {
    const destinationChanged =
      editForm.destination.trim().toLowerCase() !== destination.trim().toLowerCase();

    const hasExistingItinerary =
      places.length > 0 ||
      customSections.some((s) => s.places.length > 0) ||
      days.some((d) => d.placeIds.length > 0);

    if (destinationChanged && hasExistingItinerary) {
      const confirmed = window.confirm(t("confirmChangeDestination"));
      if (!confirmed) return;
    }

    setDestination(editForm.destination);
    setStartDate(editForm.startDate);
    setEndDate(editForm.endDate);
    setPeople(editForm.people);
    setShowEditTrip(false);

    if (destinationChanged) {
      // Make sure the new destination exists in the destinations table too,
      // same as Trip Planning does when a brand-new place is typed in.
      if (editForm.destination.trim()) {
        const token = localStorage.getItem("wanderwise_token");
        try {
          await fetch("/api/destinations/ensure", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ name: editForm.destination.trim() }),
          });
        } catch (err) {
          console.warn("Failed to ensure destination:", err);
        }
      }

      // Clear the old itinerary — it belonged to the old destination.
      // The "Where to go?" suggestions will auto-refresh on their own
      // since they're already wired to re-fetch whenever `destination` changes.
      applyChange((prev) => ({
        ...prev,
        places: [],
        customSections: [{ id: nextSectionId++, name: "", placeInput: "", places: [] }],
        days: prev.days.map((day) => ({ ...day, placeIds: [] })),
      }));
    }
  };

  const [newPlaceInput, setNewPlaceInput] = useState("");
  const newPlaceInputRef = useRef(null);

  const [suggestedPlaces, setSuggestedPlaces] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  // Whether to reveal every fetched suggestion instead of just the first
  // 12 — clicking a chip is the accurate, no-typing way to add a place, so
  // showing more of them means the student is less likely to fall back to
  // typing (and less likely to end up at the wrong place).
  const [showAllSuggestedPlaces, setShowAllSuggestedPlaces] = useState(false);

  // Autocomplete candidates for the "Add new place" input — instead of
  // silently geocoding whatever the user typed and trusting Nominatim's
  // first (sometimes wrong/fuzzy) match, we show a few real candidates
  // with their full address so the user can confirm which actual place
  // they mean before it gets added, e.g. typing "Hotel Dolores" no longer
  // auto-picks an unrelated "Villa Dolores Resort" somewhere else.
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [loadingPlaceSuggestions, setLoadingPlaceSuggestions] = useState(false);

  useEffect(() => {
    const query = newPlaceInput.trim();
    if (query.length < 3) {
      setPlaceSuggestions([]);
      setLoadingPlaceSuggestions(false);
      return;
    }
    let cancelled = false;
    setLoadingPlaceSuggestions(true);
    // Debounced so we don't fire a request on every keystroke.
    const timer = setTimeout(async () => {
      try {
        const q = encodeURIComponent(
          destination ? `${query}, ${destination}, Philippines` : `${query}, Philippines`
        );
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5&countrycodes=ph`
        );
        const data = await res.json();
        if (!cancelled) setPlaceSuggestions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Place suggestion lookup failed", err);
        if (!cancelled) setPlaceSuggestions([]);
      } finally {
        if (!cancelled) setLoadingPlaceSuggestions(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [newPlaceInput, destination]);

  useEffect(() => {
    if (!destination.trim()) {
      setSuggestedPlaces([]);
      return;
    }
    let cancelled = false;
    setLoadingSuggestions(true);
    fetch(`/api/places?destination=${encodeURIComponent(destination)}`)
      .then((resp) => resp.json())
      .then((data) => {
        if (!cancelled) setSuggestedPlaces(Array.isArray(data.places) ? data.places : []);
      })
      .catch(() => {
        if (!cancelled) setSuggestedPlaces([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [destination]);

  const generatedDays = useMemo(
    () => buildDaysFromRange(startDate, endDate),
    [startDate, endDate]
  );

  useEffect(() => {
    setTripState((prev) => {
      if (generatedDays.length === 0) return { ...prev, days: [] };
      return {
        ...prev,
        days: generatedDays.map((day, i) => ({
          ...day,
          placeIds: prev.days[i] ? prev.days[i].placeIds : [],
        })),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const findPlaceWithOrigin = (state, placeId) => {
    const mainIdx = state.places.findIndex((p) => p.id === placeId);
    if (mainIdx !== -1) return { place: state.places[mainIdx], number: mainIdx + 1 };
    for (const s of state.customSections) {
      const idx = s.places.findIndex((p) => p.id === placeId);
      if (idx !== -1) return { place: s.places[idx], number: idx + 1 };
    }
    return null;
  };

  const updatePlaceEverywhere = (state, placeId, updater) => {
    if (state.places.some((p) => p.id === placeId)) {
      return {
        ...state,
        places: state.places.map((p) => (p.id === placeId ? updater(p) : p)),
      };
    }
    return {
      ...state,
      customSections: state.customSections.map((s) => ({
        ...s,
        places: s.places.map((p) => (p.id === placeId ? updater(p) : p)),
      })),
    };
  };

  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.warn("Geolocation failed:", err.message);
        setUserLocation(null);
      }
    );
  }, []);

  const budgetSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  // A "match" here just means the words in what the user typed actually
  // show up in the name OSM returned — catches the "Hotel Dolores" typed
  // in, "Villa Dolores Resort" returned case, where Nominatim DID return
  // a result (so it isn't a plain "no result" miss), but it's clearly a
  // different, same-ish-sounding place, not the one asked for.
  function namesLikelyMatch(typedName, resultDisplayName) {
    if (!resultDisplayName) return false;
    const normalize = (s) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(Boolean);
    const typedWords = normalize(typedName);
    const resultWords = new Set(normalize(resultDisplayName));
    // Only judge on "significant" words (3+ letters) — skip short filler
    // words like "the", "sa", "ng" that don't actually identify the place.
    const significant = typedWords.filter((w) => w.length >= 3);
    if (significant.length === 0) return true; // nothing meaningful to compare, don't block
    const matchedCount = significant.filter((w) => resultWords.has(w)).length;
    return matchedCount / significant.length >= 0.5;
  }

  // geocodeStatus lets the UI tell the user, honestly, when we could NOT
  // confirm a place's real location against our free (OpenStreetMap) data
  // — instead of silently adding it with no coordinates, or guessing
  // wrong. "verified" = OSM returned a result AND its name actually
  // matches what was typed. "unverified" = either nothing came back, or
  // something came back under a clearly different name — either way, the
  // user should double-check it themselves on Google Maps before
  // trusting the directions (or before it feeds into route optimization).
  const geocodePlace = async (place) => {
    const query = encodeURIComponent(
      destination ? `${place.name}, ${destination}, Philippines` : `${place.name}, Philippines`
    );
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const matches = namesLikelyMatch(place.name, data[0].display_name);
        setTripState((prev) =>
          updatePlaceEverywhere(prev, place.id, (p) => ({
            ...p,
            lat,
            lng,
            geocodeStatus: matches ? "verified" : "unverified",
          }))
        );
      } else {
        setTripState((prev) =>
          updatePlaceEverywhere(prev, place.id, (p) => ({ ...p, geocodeStatus: "unverified" }))
        );
      }
    } catch (err) {
      console.warn("Geocoding failed for", place.name, err);
      setTripState((prev) =>
        updatePlaceEverywhere(prev, place.id, (p) => ({ ...p, geocodeStatus: "unverified" }))
      );
    }
  };

  const addPlace = (name, coords) => {
    const place = {
      id: nextPlaceId++,
      number: nextNumber++,
      name,
      visited: false,
      // coords means it came from a suggestion chip or a picked
      // autocomplete result — already confirmed, no need to re-check.
      geocodeStatus: coords ? "verified" : "pending",
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
    };
    applyChange((prev) => ({ ...prev, places: [...prev.places, place] }));
    // Only geocode blind (auto-pick first match) when we don't already have
    // confirmed coordinates from a suggestion the user themselves picked.
    if (!coords) geocodePlace(place);
  };

  // Called when the user clicks one of the autocomplete suggestions —
  // we already know exactly which place they mean and its real
  // coordinates, so no further (fuzzy) geocoding is needed.
  const handleSelectPlaceSuggestion = (suggestion) => {
    const label = (suggestion.display_name || "").split(",")[0].trim() || newPlaceInput.trim();
    addPlace(label, { lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) });
    setNewPlaceInput("");
    setPlaceSuggestions([]);
  };

  const handleAddPlace = (e) => {
    if (e.key !== "Enter" || !newPlaceInput.trim()) return;
    // If suggestions are showing, treat Enter as "confirm the top match"
    // instead of blindly re-geocoding the raw typed text — same accuracy
    // benefit as clicking a suggestion.
    if (placeSuggestions.length > 0) {
      handleSelectPlaceSuggestion(placeSuggestions[0]);
      return;
    }
    addPlace(newPlaceInput.trim());
    setNewPlaceInput("");
  };

  const toggleVisited = (placeId) => {
    applyChange((prev) => updatePlaceEverywhere(prev, placeId, (p) => ({ ...p, visited: !p.visited })));
  };

  const handleDeletePlace = (placeId) => {
    applyChange((prev) => ({
      ...prev,
      places: prev.places.filter((p) => p.id !== placeId),
      days: prev.days.map((day) => ({
        ...day,
        placeIds: day.placeIds.filter((id) => id !== placeId),
      })),
    }));
  };

  const [pendingDelete, setPendingDelete] = useState(null);

  const performDeleteWhereToGoList = () => {
    applyChange((prev) => {
      const idsToRemove = new Set(prev.places.map((p) => p.id));
      return {
        ...prev,
        places: [],
        days: prev.days.map((day) => ({
          ...day,
          placeIds: day.placeIds.filter((id) => !idsToRemove.has(id)),
        })),
      };
    });
  };

  const performDeleteSection = (sectionId) => {
    applyChange((prev) => {
      const section = prev.customSections.find((s) => s.id === sectionId);
      const idsToRemove = new Set((section?.places || []).map((p) => p.id));
      return {
        ...prev,
        customSections: prev.customSections.map((s) =>
          s.id === sectionId ? { ...s, places: [] } : s
        ),
        days: prev.days.map((day) => ({
          ...day,
          placeIds: day.placeIds.filter((id) => !idsToRemove.has(id)),
        })),
      };
    });
  };

  const handleDeleteWhereToGoList = () => setPendingDelete({ type: "whereToGo" });

  const confirmPendingDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === "whereToGo") performDeleteWhereToGoList();
    if (pendingDelete.type === "section") performDeleteSection(pendingDelete.id);
    setPendingDelete(null);
  };

  const handleNewList = () => {
    const newlyCreated = [];
    applyChange((prev) => ({
      ...prev,
      customSections: prev.customSections.map((s) => {
        if (!s.placeInput.trim()) return s;
        const place = {
          id: nextPlaceId++,
          number: nextNumber++,
          name: s.placeInput.trim(),
          visited: false,
          geocodeStatus: "pending",
        };
        newlyCreated.push(place);
        return { ...s, places: [...s.places, place], placeInput: "" };
      }),
    }));
    newlyCreated.forEach(geocodePlace);
  };

  const [editingSectionName, setEditingSectionName] = useState({});

  const toggleSectionNameEdit = (sectionId) => {
    setEditingSectionName((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const handleSectionNameChange = (sectionId, value) => {
    setTripState((prev) => ({
      ...prev,
      customSections: prev.customSections.map((s) =>
        s.id === sectionId ? { ...s, name: value } : s
      ),
    }));
  };

  const handleSectionPlaceInputChange = (sectionId, value) => {
    setTripState((prev) => ({
      ...prev,
      customSections: prev.customSections.map((s) =>
        s.id === sectionId ? { ...s, placeInput: value } : s
      ),
    }));
  };

  const toggleSectionPlaceVisited = (sectionId, placeId) => {
    applyChange((prev) => ({
      ...prev,
      customSections: prev.customSections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              places: s.places.map((p) =>
                p.id === placeId ? { ...p, visited: !p.visited } : p
              ),
            }
      ),
    }));
  };

  const handleDeleteSection = (sectionId) => setPendingDelete({ type: "section", id: sectionId });

  const [dayInputs, setDayInputs] = useState({});

  const handleDayInputChange = (dayIndex, value) => {
    setDayInputs((prev) => ({ ...prev, [dayIndex]: value }));
  };

  const handleAddDayPlace = (dayIndex) => (e) => {
    if (e.key !== "Enter") return;
    const value = (dayInputs[dayIndex] || "").trim();
    if (!value) return;

    let createdPlace = null;

    applyChange((prev) => {
      const lower = value.toLowerCase();
      let existing = prev.places.find((p) => p.name.trim().toLowerCase() === lower);
      if (!existing) {
        for (const s of prev.customSections) {
          existing = s.places.find((p) => p.name.trim().toLowerCase() === lower);
          if (existing) break;
        }
      }

      let updatedState = prev;
      let placeId;
      if (existing) {
        placeId = existing.id;
      } else {
        const newPlace = {
          id: nextPlaceId++,
          number: nextNumber++,
          name: value,
          visited: false,
          geocodeStatus: "pending",
        };
        createdPlace = newPlace;
        updatedState = { ...prev, places: [...prev.places, newPlace] };
        placeId = newPlace.id;
      }

      return {
        ...updatedState,
        days: updatedState.days.map((day, i) => {
          if (i !== dayIndex) return day;
          if (day.placeIds.includes(placeId)) return day;
          return { ...day, placeIds: [...day.placeIds, placeId] };
        }),
      };
    });
    if (createdPlace) geocodePlace(createdPlace);
    setDayInputs((prev) => ({ ...prev, [dayIndex]: "" }));
  };

  const [draggingPlaceId, setDraggingPlaceId] = useState(null);

  const handleItemDragStart = (e, dayIndex, placeId) => {
    setDraggingPlaceId(placeId);
    e.dataTransfer.setData("text/plain", JSON.stringify({ dayIndex, placeId }));
  };

  const handleItemDragOver = (e) => {
    e.preventDefault();
  };

  const handleItemDrop = (e, dayIndex, targetPlaceId) => {
    e.preventDefault();
    setDraggingPlaceId(null);
    let data;
    try {
      data = JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {
      return;
    }
    if (!data || data.dayIndex !== dayIndex || data.placeId === targetPlaceId) return;

    applyChange((prev) => ({
      ...prev,
      days: prev.days.map((day, i) => {
        if (i !== dayIndex) return day;
        const ids = [...day.placeIds];
        const fromIdx = ids.indexOf(data.placeId);
        const toIdx = ids.indexOf(targetPlaceId);
        if (fromIdx === -1 || toIdx === -1) return day;
        ids.splice(fromIdx, 1);
        ids.splice(toIdx, 0, data.placeId);
        return { ...day, placeIds: ids };
      }),
    }));
  };

  // Smart Route Optimization: reorders ONE day's places into the shortest
  // driving order (first place stays first). Uses OSRM's free /table
  // service for real road distances between every pair of places, then
  // picks the best order locally. Goes through applyChange, so Undo works
  // and it saves like a normal drag-reorder.
  // optimizeInfo[dayIndex] = { status, beforeS/afterS (seconds), beforeM/
  // afterM (meters), skippedNames, forIds } — forIds
  // lets the message disappear by itself once the day is changed again.
  const [optimizeInfo, setOptimizeInfo] = useState({});

  const optimizeDay = async (dayIndex) => {
    const day = days[dayIndex];
    const entries = day.placeIds
      .map((id) => findPlaceWithOrigin(tripState, id))
      .filter(Boolean)
      .map(({ place }) => place);
    const withCoords = entries.filter((p) => p.lat != null && p.lng != null);
    const withoutCoords = entries.filter((p) => p.lat == null || p.lng == null);
    const unknownIds = day.placeIds.filter((id) => !entries.some((p) => p.id === id));
    if (withCoords.length < 3) return;

    setOptimizeInfo((prev) => ({ ...prev, [dayIndex]: { status: "loading" } }));
    // Places with no confirmed location can't be measured, so they're left
    // out of the calculation — named in the result so the student knows.
    const skippedNames = withoutCoords.map((p) => p.name);
    try {
      const coords = withCoords.map((p) => `${p.lng},${p.lat}`).join(";");
      const res = await fetch(
        `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration,distance`
      );
      const data = await res.json();
      if (data.code !== "Ok" || !data.durations) throw new Error(data.code || "No durations");

      // Optimize on TRAVEL TIME (seconds), not km — a longer highway can be
      // faster than a short road through town. Distance is only shown.
      const timeMatrix = data.durations;
      const distMatrix = data.distances;
      const currentOrder = withCoords.map((_, i) => i);
      const bestOrder = bestOpenPath(timeMatrix);
      const beforeS = pathLength(currentOrder, timeMatrix);
      const afterS = pathLength(bestOrder, timeMatrix);
      const beforeM = distMatrix ? pathLength(currentOrder, distMatrix) : null;
      const afterM = distMatrix ? pathLength(bestOrder, distMatrix) : null;

      // Less than a minute saved isn't worth reshuffling the student's list.
      if (afterS >= beforeS - 60) {
        setOptimizeInfo((prev) => ({
          ...prev,
          [dayIndex]: { status: "already", skippedNames, forIds: day.placeIds.join(",") },
        }));
        return;
      }

      // Places without a confirmed location keep their relative order at
      // the end of the day instead of vanishing.
      const newIds = [
        ...bestOrder.map((i) => withCoords[i].id),
        ...withoutCoords.map((p) => p.id),
        ...unknownIds,
      ];
      applyChange((prev) => ({
        ...prev,
        days: prev.days.map((d, i) => (i === dayIndex ? { ...d, placeIds: newIds } : d)),
      }));
      setOptimizeInfo((prev) => ({
        ...prev,
        [dayIndex]: {
          status: "done",
          beforeS,
          afterS,
          beforeM,
          afterM,
          skippedNames,
          forIds: newIds.join(","),
        },
      }));
    } catch (err) {
      console.warn("Route optimization failed:", err);
      setOptimizeInfo((prev) => ({ ...prev, [dayIndex]: { status: "error" } }));
    }
  };

  // Dates come back as "2026-04-17T00:00:00" — only the date part matters.
  const bookingDate = (value) => (value ? String(value).slice(0, 10) : "");
  const [editingTimeFor, setEditingTimeFor] = useState(null);

  const updatePlaceTime = (placeId, value) => {
    setTripState((prev) => updatePlaceEverywhere(prev, placeId, (p) => ({ ...p, time: value })));
  };

  const updatePlaceNote = (placeId, value) => {
    setTripState((prev) => updatePlaceEverywhere(prev, placeId, (p) => ({ ...p, note: value })));
  };

  const whereToGoRef = useRef(null);
  const itineraryRef = useRef(null);
  const untitledRef = useRef(null);

  const scrollToRef = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // "Directions" now opens the dedicated /directions page (its own route,
  // its own map) instead of drawing the route inline here — same OSRM/OSM
  // data underneath, just shown on a separate screen like Google Maps'
  // own Directions view.
  const openDirections = (place) => {
    if (!place.lat || !place.lng) {
      // No confirmed coordinates for this place at all — nowhere real to
      // route to, so fall back to a Google Maps search the student can
      // check manually (same as the "unverified" warning's own link).
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${destination}`)}`,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }
    navigate("/directions", {
      state: { placeName: place.name, lat: place.lat, lng: place.lng, origin: userLocation },
    });
  };

  // Quick "X min - Y km" summary shown next to each itinerary place's
  // Directions link — computed the same way (OSRM, from the student's
  // current location) as the dedicated Directions page, just condensed.
  const [placeTravelInfo, setPlaceTravelInfo] = useState({});

  useEffect(() => {
    if (!userLocation) return;
    const targets = days
      .flatMap((day) => day.placeIds.map((id) => findPlaceWithOrigin(tripState, id)))
      .filter(Boolean)
      .map(({ place }) => place)
      .filter((p) => p.lat != null && p.lng != null && !placeTravelInfo[p.id]);

    if (targets.length === 0) return;
    let cancelled = false;

    targets.forEach((p) => {
      setPlaceTravelInfo((prev) => ({ ...prev, [p.id]: { loading: true } }));
      const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${p.lng},${p.lat}?overview=false`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          if (data.code === "Ok" && data.routes && data.routes[0]) {
            const route = data.routes[0];
            setPlaceTravelInfo((prev) => ({
              ...prev,
              [p.id]: { loading: false, distanceM: route.distance, durationS: route.duration },
            }));
          } else {
            setPlaceTravelInfo((prev) => ({ ...prev, [p.id]: { loading: false, error: true } }));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPlaceTravelInfo((prev) => ({ ...prev, [p.id]: { loading: false, error: true } }));
          }
        });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, days, tripState]);

  const formatTravelDuration = (seconds) => {
    const totalMinutes = Math.round(seconds / 60);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
  };
  const formatTravelDistance = (meters) => formatDistance(meters);

  const [addingCostFor, setAddingCostFor] = useState(null);
  const [costCategory, setCostCategory] = useState(COST_CATEGORIES[0]);
  const [customCostCategory, setCustomCostCategory] = useState("");
  const [costAmount, setCostAmount] = useState("");

  const openAddCost = (placeId) => {
    setAddingCostFor(placeId);
    setCostCategory(COST_CATEGORIES[0]);
    setCustomCostCategory("");
    setCostAmount("");
  };

  const confirmAddCost = (placeId) => {
    const amount = Number(costAmount);
    if (!amount || amount <= 0) return;
    const category =
      costCategory === "Other" && customCostCategory.trim()
        ? customCostCategory.trim()
        : costCategory;
    applyChange((prev) =>
      updatePlaceEverywhere(prev, placeId, (p) => ({
        ...p,
        costs: [...(p.costs || []), { id: Date.now(), category, amount }],
      }))
    );
    setAddingCostFor(null);
    setCostAmount("");
    setCustomCostCategory("");
  };

  const removeCost = (placeId, costId) => {
    applyChange((prev) =>
      updatePlaceEverywhere(prev, placeId, (p) => ({
        ...p,
        costs: (p.costs || []).filter((c) => c.id !== costId),
      }))
    );
  };

  const expensesRef = useRef(null);

  const [showEditBudget, setShowEditBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budgetTotal);

  const openEditBudget = () => {
    setBudgetInput(budgetTotal);
    setShowEditBudget(true);
  };

  const handleSaveBudget = () => {
    applyChange((prev) => ({ ...prev, budgetTotal: Number(budgetInput) || 0 }));
    setShowEditBudget(false);
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm(t("confirmDeleteExpense"))) return;
    const token = localStorage.getItem("wanderwise_token");
    if (tripId && token) {
      try {
        await fetch(`/api/trips/${tripId}/expenses/${expenseId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.warn("Failed to delete expense:", err);
      }
    }
    setTripState((prev) => ({
      ...prev,
      expenses: (prev.expenses || []).filter((e) => e.id !== expenseId),
    }));
  };

  const handleGoToAddExpense = () => {
    const tripPlanItems = [...places, ...customSections.flatMap((s) => s.places)];
    navigate("/add-expense", {
      state: {
        destination,
        startDate,
        endDate,
        people,
        tripState,
        returnPath: `/trip-plan${tripId ? `?tripId=${tripId}` : ""}`,
        tripPlanItems,
        tripId,
      },
    });
  };

  const handleGoToBreakdown = () => {
    navigate("/breakdown", {
      state: {
        destination,
        startDate,
        endDate,
        people,
        tripState,
        returnPath: `/trip-plan${tripId ? `?tripId=${tripId}` : ""}`,
        expenses,
        days,
      },
    });
  };

    const handleGoToAddCrew = () => {
    navigate("/invite-crew", {
      state: {
        destination,
        startDate,
        endDate,
        people,
        tripState,
        returnPath: `/trip-plan${tripId ? `?tripId=${tripId}` : ""}`,
        tripId,
      },
    });
  };

  return (
    <div className="ww-builder-page">
      <header className="ww-builder-topbar">
        <div className="ww-brand">
          <img src="/assets/logo.jpg" alt="WanderWise logo" className="ww-logo" />
          <span className="ww-brand-name">WanderWise!</span>
        </div>
        <div className="ww-builder-topbar-actions">
          <span
            className="ww-undo-redo"
            onClick={handleUndo}
            style={{ cursor: past.length === 0 ? "default" : "pointer", opacity: past.length === 0 ? 0.4 : 1 }}
          >
            ↩ {t("undo")}
          </span>
          <span className="ww-builder-saved">{saveStatusLabel}</span>
          <span
            className="ww-undo-redo"
            onClick={handleRedo}
            style={{ cursor: future.length === 0 ? "default" : "pointer", opacity: future.length === 0 ? 0.4 : 1 }}
          >
            ↪ {t("redo")}
          </span>
          <button className="ww-trip-plan-btn">{t("tripPlanBtn")}</button>
          <div className="ww-menu-wrapper" ref={topMenuRef}>
            <span
              className="ww-menu-dropdown"
              onClick={() => setTopMenuOpen((v) => !v)}
              style={{ cursor: "pointer" }}
            >
              ⋯
            </span>
            {topMenuOpen && (
              <div className="ww-menu-panel">
                <p className="ww-menu-item" onClick={() => goToTopMenu("/dashboard")}>
                  {t("navHome")}
                </p>
                <p className="ww-menu-item" onClick={() => goToTopMenu("/travel-tips")}>
                  {t("navGuides")}
                </p>
                <p className="ww-menu-item" onClick={() => goToTopMenu("/profile")}>
                  {t("navProfile")}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="ww-builder-body">
        <aside className="ww-builder-sidebar">
          <p className="ww-sidebar-item active">{t("overview")}</p>
          <p className="ww-sidebar-item" onClick={() => scrollToRef(whereToGoRef)} style={{ cursor: "pointer" }}>
            {whereToGoTitle || t("whereToGoDefault")}
          </p>
          <p className="ww-sidebar-item" onClick={() => scrollToRef(itineraryRef)} style={{ cursor: "pointer" }}>
            {t("notes")}
          </p>
          <p className="ww-sidebar-item" onClick={() => scrollToRef(untitledRef)} style={{ cursor: "pointer" }}>
            {customSections[0]?.name?.trim() || t("untitled")}
          </p>
          <p className="ww-sidebar-header">{t("itinerary")}</p>
          {days.map((day) => (
            <p className="ww-sidebar-item" key={day.label}>{day.label}</p>
          ))}
          <p className="ww-sidebar-header">{t("budget")}</p>
          <p className="ww-sidebar-item" onClick={() => scrollToRef(expensesRef)} style={{ cursor: "pointer" }}>
            {t("view")}
          </p>
        </aside>

        <main className="ww-builder-main">
          <h1 className="ww-builder-trip-title">
            {t("tripToPrefix")} {destination || t("yourNextDestination")}{" "}
            <span className="ww-edit-icon" onClick={openEditTrip} style={{ cursor: "pointer" }}>
              ✎
            </span>
          </h1>
          {startDate && endDate && (
            <p className="ww-builder-dates">📅 {formatDateRange(startDate, endDate)}</p>
          )}

          <div className="ww-builder-map">
            <TripMap
              places={places}
              destinationMarker={destinationCoords}
              destinationLabel={destination}
            />
          </div>

          <button
            className="ww-browse-btn"
            onClick={() =>
              // Opens the Hotels page in "trip mode": destination and dates
              // pre-filled, plus the form to record the booking on this trip.
              navigate("/hotels", {
                state: { tripId, destination, startDate, endDate, buddies: people },
              })
            }
          >
            🏨 {t("bookAHotel")}
          </button>

          {bookings.length > 0 && (
            <p className="ww-bookings-count">
              ✓ {bookings.length} {t("bookingsRecordedCount")}
            </p>
          )}

          <h2 className="ww-builder-section-title">
            <span className="ww-title-with-icon">
              {editingWhereToGoTitle ? (
                <input
                  className="ww-section-name-input-inline"
                  value={whereToGoTitle}
                  onChange={(e) => setWhereToGoTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEditingWhereToGoTitle(false);
                  }}
                  autoFocus
                />
              ) : (
                <span>{whereToGoTitle}</span>
              )}
              <span
                className="ww-edit-icon"
                onClick={() => setEditingWhereToGoTitle((v) => !v)}
                style={{ cursor: "pointer" }}
              >
                ✎
              </span>
            </span>
            <span
              className="ww-more-icon"
              onClick={handleDeleteWhereToGoList}
              style={{ cursor: "pointer" }}
              title={t("deleteThisListTitle")}
            >
              ⋯
            </span>
          </h2>
          <div ref={whereToGoRef} />

          {loadingSuggestions && (
            <p className="ww-field-label" style={{ marginBottom: 8 }}>
              {t("loadingSuggestedPlaces")}
            </p>
          )}

          {suggestedPlaces.length > 0 && (
            <div className="ww-suggested-places-panel">
              <p className="ww-suggested-places-label">
                {t("suggestedPlacesIn")} {destination}:
              </p>
              <div className="ww-suggested-chips">
                {suggestedPlaces.slice(0, showAllSuggestedPlaces ? suggestedPlaces.length : 12).map((sp) => (
                  <button
                    key={sp.name}
                    type="button"
                    className="ww-suggested-chip"
                    // sp already carries real coordinates from the Overpass
                    // lookup (see PlacesController) — pass them straight
                    // through instead of re-geocoding the name by text,
                    // which is what let a fuzzy/wrong match sneak in before.
                    onClick={() => addPlace(sp.name, { lat: sp.lat, lng: sp.lon })}
                  >
                    <span className="ww-suggested-chip-plus">+</span> {sp.name}
                    {/* Only shown when OpenStreetMap explicitly says entry
                        is free (fee=no) — helps students pick places that
                        fit their budget (FR 14). */}
                    {sp.isFree && <span className="ww-free-badge">{t("freeEntry")}</span>}
                  </button>
                ))}
              </div>
              {/* Clicking a chip is the safest way to add a place (real,
                  verified OSM coordinates, no typing/fuzzy-matching
                  involved), so we let the user reveal every suggestion we
                  fetched instead of hiding most of them behind the
                  12-item cap. */}
              {suggestedPlaces.length > 12 && (
                <button
                  type="button"
                  className="ww-show-more-btn"
                  onClick={() => setShowAllSuggestedPlaces((v) => !v)}
                >
                  {showAllSuggestedPlaces
                    ? `${t("showFewerPlaces")} ▴`
                    : `${t("showMorePlaces")} (+${suggestedPlaces.length - 12}) ▾`}
                </button>
              )}
            </div>
          )}

          {places.map((p, i) => (
            <div className="ww-place-card" key={p.id}>
              <p className="ww-place-name">
                📍{i + 1} {p.name} {p.visited && <span className="ww-visited-badge">✅ {t("visited")}</span>}
              </p>

              {/* Shown when our free (OpenStreetMap) lookup could NOT
                  confirm this place's real location — honest instead of
                  silently guessing, or worse, silently being wrong. The
                  button opens an actual Google Maps SEARCH (not
                  directions) so the student can see the real pin
                  themselves and judge if it's the same place. */}
              {/* Fires both when nothing was found at all, AND when
                  something was found but under a clearly different name
                  (namesLikelyMatch caught a mismatch) — either way the
                  place shouldn't be trusted blindly. */}
              {(p.geocodeStatus === "unverified" ||
                ((p.lat == null || p.lng == null) && p.geocodeStatus !== "pending")) && (
                <div className="ww-unverified-warning">
                  <span className="ww-unverified-warning-icon">⚠️</span>
                  <span className="ww-unverified-warning-text">{t("locationUnverifiedWarning")}</span>
                  <a
                    className="ww-unverified-warning-link"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${p.name}, ${destination}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("viewOnGoogleMaps")} ↗
                  </a>
                </div>
              )}

              <input
                className="ww-place-notes-input"
                placeholder={t("addNotesPlaceholder")}
                value={p.note || ""}
                onChange={(e) => updatePlaceNote(p.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.target.blur();
                }}
              />
              <p className="ww-place-actions">
                <span>🕐 {t("selectTime")}</span>
                <span>$ {t("addCost")}</span>
              </p>
              {(p.costs || []).length > 0 && (
                <p className="ww-cost-total-inline">
                  {t("expectedCost")}: ₱{p.costs.reduce((s, c) => s + c.amount, 0).toLocaleString()}
                </p>
              )}
              <p
                className="ww-mark-visited"
                onClick={() => toggleVisited(p.id)}
                style={{ cursor: "pointer" }}
              >
                {p.visited ? `✕ ${t("unmarkVisited")}` : `✓ ${t("markVisited")}`}
              </p>
            </div>
          ))}

          {/* Typing is the fallback, not the main path — clicking a
              suggested-places chip above (real OSM coordinates, no
              fuzzy text matching) is the safer default. This is only
              here for a place that isn't in the suggested list at all. */}
          <p className="ww-field-label" style={{ marginBottom: 6, fontSize: 12, opacity: 0.8 }}>
            {t("addPlaceFallbackLabel")}
          </p>
          <div style={{ position: "relative" }}>
            <input
              ref={newPlaceInputRef}
              className="ww-add-place-input"
              placeholder={`📍 ${t("addNewPlacePlaceholder")}`}
              value={newPlaceInput}
              onChange={(e) => setNewPlaceInput(e.target.value)}
              onKeyDown={handleAddPlace}
            />

            {newPlaceInput.trim().length >= 3 &&
              (loadingPlaceSuggestions || placeSuggestions.length > 0) && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    background: "#fff",
                    border: "1px solid #dbeceb",
                    borderRadius: 8,
                    marginTop: 4,
                    boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                    maxHeight: 240,
                    overflowY: "auto",
                  }}
                >
                  {loadingPlaceSuggestions && (
                    <p style={{ padding: "8px 12px", margin: 0, fontSize: 13, color: "#7a6a4f" }}>
                      {t("loadingEllipsis")}
                    </p>
                  )}
                  {!loadingPlaceSuggestions &&
                    placeSuggestions.map((sug) => (
                      <div
                        key={sug.place_id}
                        onClick={() => handleSelectPlaceSuggestion(sug)}
                        style={{
                          padding: "8px 12px",
                          fontSize: 13,
                          cursor: "pointer",
                          borderBottom: "1px solid #f0ede0",
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        📍 {sug.display_name}
                      </div>
                    ))}
                  {!loadingPlaceSuggestions && placeSuggestions.length === 0 && (
                    <p style={{ padding: "8px 12px", margin: 0, fontSize: 13, color: "#7a6a4f" }}>
                      {t("noPlaceMatches")}
                    </p>
                  )}
                </div>
              )}
          </div>

          <hr className="ww-builder-divider" />

          {customSections.map((section, sectionIndex) => (
            <div key={section.id} className="ww-custom-section" ref={sectionIndex === 0 ? untitledRef : null}>
              <h2
                className={`ww-builder-section-title ${
                  section.name ? "" : "ww-section-placeholder-title"
                }`}
              >
                <span className="ww-title-with-icon">
                  {editingSectionName[section.id] ? (
                    <input
                      className="ww-section-name-input-inline"
                      placeholder={t("nameThisSectionPlaceholder")}
                      value={section.name}
                      onChange={(e) => handleSectionNameChange(section.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") toggleSectionNameEdit(section.id);
                      }}
                      autoFocus
                    />
                  ) : (
                    <span>{section.name || t("nameThisSectionPlaceholder")}</span>
                  )}
                  <span
                    className="ww-edit-icon"
                    onClick={() => toggleSectionNameEdit(section.id)}
                    style={{ cursor: "pointer" }}
                  >
                    ✎
                  </span>
                </span>
                <span
                  className="ww-more-icon"
                  onClick={() => handleDeleteSection(section.id)}
                  style={{ cursor: "pointer" }}
                  title={t("deleteThisListTitle")}
                >
                  ⋯
                </span>
              </h2>

              {section.places.map((p, i) => (
                <div className="ww-place-card" key={p.id}>
                  <p className="ww-place-name">
                    📍{i + 1} {p.name} {p.visited && <span className="ww-visited-badge">✅ {t("visited")}</span>}
                  </p>
                  <input
                    className="ww-place-notes-input"
                    placeholder={t("addNotesPlaceholder")}
                    value={p.note || ""}
                    onChange={(e) => updatePlaceNote(p.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.target.blur();
                    }}
                  />
                  <p className="ww-place-actions">
                    <span>🕐 {t("selectTime")}</span>
                    <span>$ {t("addCost")}</span>
                  </p>
                  <p
                    className="ww-mark-visited"
                    onClick={() => toggleSectionPlaceVisited(section.id, p.id)}
                    style={{ cursor: "pointer" }}
                  >
                    {p.visited ? `✕ ${t("unmarkVisited")}` : `✓ ${t("markVisited")}`}
                  </p>
                </div>
              ))}

              <input
                className="ww-add-place-input"
                placeholder={`📍 ${t("addNewPlacePlaceholder")}`}
                value={section.placeInput}
                onChange={(e) => handleSectionPlaceInputChange(section.id, e.target.value)}
              />
            </div>
          ))}

          <button className="ww-new-list-btn" onClick={handleNewList}>
            + {t("newListBtn")}
          </button>

          <hr className="ww-builder-thick-divider" />

          {days.length > 0 && (
            <>
              <h2 className="ww-builder-section-title" ref={itineraryRef}>
                {t("itinerary")}
                {startDate && endDate && (
                  <span className="ww-date-pill">📅 {formatDateRange(startDate, endDate)}</span>
                )}
              </h2>

              {days.map((day, dayIndex) => {
                const dayPlaces = day.placeIds
                  .map((id) => findPlaceWithOrigin(tripState, id))
                  .filter(Boolean);

                const routablePlaces = dayPlaces.filter(
                  ({ place }) => place.lat != null && place.lng != null
                ).length;
                const info = optimizeInfo[dayIndex];
                // Hide the result once the day's list changes again (drag,
                // add, remove) so it never describes an order that's gone.
                const showInfo =
                  info &&
                  (info.status === "loading" ||
                    info.status === "error" ||
                    info.forIds === day.placeIds.join(","));

                return (
                  <div className="ww-day-block" key={day.label}>
                    <div className="ww-day-header-row">
                      <p className="ww-day-header">⌄ {day.label}</p>
                      {routablePlaces >= 3 && (
                        <button
                          type="button"
                          className="ww-optimize-btn"
                          onClick={() => optimizeDay(dayIndex)}
                          disabled={info?.status === "loading"}
                          title={t("optimizeRouteHint")}
                        >
                          {info?.status === "loading" ? t("optimizingRoute") : `⇅ ${t("optimizeRoute")}`}
                        </button>
                      )}
                    </div>
                    {showInfo && info.status === "done" && (
                      <p className="ww-optimize-result">
                        ✓ {t("routeOptimized")} {formatTravelDuration(info.beforeS)} →{" "}
                        <strong>{formatTravelDuration(info.afterS)}</strong>
                        {info.beforeM != null && info.afterM != null && (
                          <> ({formatTravelDistance(info.beforeM)} → {formatTravelDistance(info.afterM)})</>
                        )}
                      </p>
                    )}
                    {showInfo && info.status === "already" && (
                      <p className="ww-optimize-result">✓ {t("routeAlreadyShortest")}</p>
                    )}
                    {showInfo &&
                      (info.status === "done" || info.status === "already") &&
                      info.skippedNames?.length > 0 && (
                        <p className="ww-optimize-result ww-optimize-error">
                          ⚠️ {t("routeSkippedPlaces")} {info.skippedNames.join(", ")}
                        </p>
                      )}
                    {showInfo && info.status === "error" && (
                      <p className="ww-optimize-result ww-optimize-error">⚠️ {t("routeOptimizeFailed")}</p>
                    )}
                    {/* Recorded bookings land on the day they start/end. */}
                    {(() => {
                      const dayIso = addDaysIso(startDate, dayIndex);
                      if (!dayIso) return null;
                      return bookings
                        .filter((b) => bookingDate(b.checkIn) === dayIso || bookingDate(b.checkOut) === dayIso)
                        .map((b) => (
                          <p className="ww-day-booking" key={`bk-${b.id}-${dayIso}`}>
                            🏨 {bookingDate(b.checkIn) === dayIso ? t("bookingCheckIn") : t("bookingCheckOut")}:{" "}
                            <strong>{b.placeName}</strong>
                            {b.confirmationNumber && <> · #{b.confirmationNumber}</>}
                          </p>
                        ));
                    })()}
                    {dayPlaces.map(({ place: p, number }, i) => (
                      <React.Fragment key={p.id}>
                        <div
                          className="ww-place-card ww-itinerary-place"
                          draggable
                          onDragStart={(e) => handleItemDragStart(e, dayIndex, p.id)}
                          onDragOver={handleItemDragOver}
                          onDrop={(e) => handleItemDrop(e, dayIndex, p.id)}
                          style={{
                            cursor: "grab",
                            opacity: draggingPlaceId === p.id ? 0.5 : 1,
                          }}
                        >
                          <div className="ww-visited-checkbox">
                            <input
                              type="checkbox"
                              checked={p.visited}
                              onChange={() => toggleVisited(p.id)}
                            />
                          </div>
                          <div>
                            <p className="ww-place-name">
                              📍{number} {p.name}
                              {/* Tells the student up front which places
                                  have no confirmed location, so they know
                                  why a place is skipped by "Optimize route"
                                  and has no travel time. */}
                              {(p.lat == null || p.lng == null) && (
                                <span className="ww-no-location-tag" title={t("locationUnverifiedWarning")}>
                                  ⚠️ {t("noLocationTag")}
                                </span>
                              )}
                            </p>
                            <input
                              className="ww-place-notes-input"
                              placeholder={t("addNotesPlaceholder")}
                              value={p.note || ""}
                              onChange={(e) => updatePlaceNote(p.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.target.blur();
                              }}
                            />
                            <p className="ww-place-actions">
                              {editingTimeFor === p.id ? (
                                <input
                                  type="time"
                                  autoFocus
                                  value={p.time || ""}
                                  onChange={(e) => updatePlaceTime(p.id, e.target.value)}
                                  onBlur={() => setEditingTimeFor(null)}
                                />
                              ) : (
                                <span
                                  onClick={() => setEditingTimeFor(p.id)}
                                  style={{ cursor: "pointer" }}
                                >
                                  🕐 {p.time ? formatTime(p.time) : t("selectTime")}
                                </span>
                              )}
                              <span
                                onClick={() => openAddCost(p.id)}
                                style={{ cursor: "pointer" }}
                              >
                                $ {t("addCost")}
                              </span>
                            </p>

                            {addingCostFor === p.id && (
                              <div className="ww-cost-add-row">
                                <select
                                  value={costCategory}
                                  onChange={(e) => setCostCategory(e.target.value)}
                                >
                                  {COST_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{t(COST_CATEGORY_KEYS[c])}</option>
                                  ))}
                                </select>
                                {costCategory === "Other" && (
                                  <input
                                    type="text"
                                    placeholder={t("typeCategory")}
                                    value={customCostCategory}
                                    onChange={(e) => setCustomCostCategory(e.target.value)}
                                  />
                                )}
                                <input
                                  type="number"
                                  min="0"
                                  placeholder={`₱ ${t("amount")}`}
                                  value={costAmount}
                                  onChange={(e) => setCostAmount(e.target.value)}
                                />
                                <button onClick={() => confirmAddCost(p.id)}>{t("add")}</button>
                              </div>
                            )}

                            {(p.costs || []).length > 0 && (
                              <div className="ww-cost-breakdown">
                                {p.costs.map((c) => (
                                  <div className="ww-cost-line" key={c.id}>
                                    <span>{c.category}</span>
                                    <span>
                                      ₱{c.amount.toLocaleString()}
                                      <span
                                        className="ww-cost-remove"
                                        onClick={() => removeCost(p.id, c.id)}
                                      >
                                        ✕
                                      </span>
                                    </span>
                                  </div>
                                ))}
                                <div className="ww-cost-total">
                                  {t("expectedCost")}: ₱
                                  {p.costs.reduce((s, c) => s + c.amount, 0).toLocaleString()}
                                </div>
                              </div>
                            )}

                            <p
                              className="ww-mark-visited"
                              onClick={() => toggleVisited(p.id)}
                              style={{ cursor: "pointer" }}
                            >
                              {p.visited ? `✕ ${t("unmarkVisited")}` : `✓ ${t("markVisited")}`}
                            </p>
                          </div>
                        </div>
                        <p className="ww-directions-hint">
                          {/* Quick preview of travel time/distance from
                              where the student is right now — the full
                              route + info lives on the dedicated
                              Directions page, this is just the summary. */}
                          {p.lat != null &&
                            p.lng != null &&
                            placeTravelInfo[p.id] &&
                            !placeTravelInfo[p.id].loading &&
                            !placeTravelInfo[p.id].error && (
                              <span style={{ marginRight: 8 }}>
                                🚗 {formatTravelDuration(placeTravelInfo[p.id].durationS)} -{" "}
                                {formatTravelDistance(placeTravelInfo[p.id].distanceM)} |{" "}
                              </span>
                            )}
                          <span
                            className="ww-directions-link"
                            onClick={() => openDirections(p)}
                            style={{ cursor: "pointer" }}
                          >
                            {p.lat != null && p.lng != null && placeTravelInfo[p.id]
                              ? t("directions")
                              : `🚗 ${t("directions")}`}
                          </span>
                        </p>
                      </React.Fragment>
                    ))}
                    <input
                      className="ww-add-place-input"
                      placeholder={`📍 ${t("addNewPlacePlaceholder")}`}
                      value={dayInputs[dayIndex] || ""}
                      onChange={(e) => handleDayInputChange(dayIndex, e.target.value)}
                      onKeyDown={handleAddDayPlace(dayIndex)}
                    />
                  </div>
                );
              })}

              <hr className="ww-builder-thick-divider" />
            </>
          )}

          <h2 className="ww-builder-section-title">{t("budget")}</h2>
          <div className="ww-budget-card">
            <p className="ww-budget-amount">₱{budgetSpent.toLocaleString()}.00</p>
            <p className="ww-budget-total">
              {t("budgetLabel")}: ₱{budgetTotal.toLocaleString()}.00{" "}
              <span className="ww-edit-icon" onClick={openEditBudget} style={{ cursor: "pointer" }}>
                ✎
              </span>
            </p>
            <div className="ww-budget-buttons">
              <button className="ww-add-expense-btn" onClick={handleGoToAddExpense}>
                + {t("addExpenseBtn")}
              </button>
            </div>
            <p className="ww-budget-link" onClick={handleGoToBreakdown} style={{ cursor: "pointer" }}>
              📊 {t("viewBreakdown")}
            </p>
            <p className="ww-budget-link" onClick={handleGoToAddCrew} style={{ cursor: "pointer" }}>
              👤 {t("addCrew")}
            </p>
          </div>

          <h2 className="ww-builder-section-title" ref={expensesRef}>⌄ {t("expensesHeader")}</h2>
          {expenses.length === 0 ? (
            <p className="ww-expense-empty">{t("noExpensesYetAddOne")}</p>
          ) : (
            expenses.map((e) => (
              <div className="ww-expense-row" key={e.id}>
                <span>{e.icon} {e.description || e.label}</span>
                <span>
                  ₱{e.amount.toLocaleString()}
                  <span
                    className="ww-cost-remove"
                    onClick={() => handleDeleteExpense(e.id)}
                    style={{ cursor: "pointer", marginLeft: 8 }}
                    title={t("deleteThisExpenseTitle")}
                  >
                    ✕
                  </span>
                </span>
              </div>
            ))
          )}
        </main>
      </div>

      {showEditTrip && (
        <div className="ww-modal-overlay" onClick={() => setShowEditTrip(false)}>
          <div className="ww-planning-form ww-modal-card" onClick={(e) => e.stopPropagation()}>
            <h1 className="ww-planning-title">{t("editYourTrip")}</h1>
            <label className="ww-planning-label">{t("destinationQuestion")}</label>
            <input
              type="text"
              className="ww-planning-input"
              placeholder="Boracay"
              list="ww-edit-destination-options"
              value={editForm.destination}
              onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
            />
            <datalist id="ww-edit-destination-options">
              {destinationOptions.map((d) => (
                <option key={d.id} value={d.name} />
              ))}
            </datalist>
            <hr className="ww-planning-divider" />
            <label className="ww-planning-label">{t("dates")}</label>
            <div className="ww-dates-row">
              <input
                type="date"
                className="ww-date-input"
                value={editForm.startDate}
                onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
              />
              <input
                type="date"
                className="ww-date-input"
                value={editForm.endDate}
                onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
              />
            </div>
            <hr className="ww-planning-divider" />
            <label className="ww-planning-label ww-center-label">{t("howManyPeople")}</label>
            <div className="ww-people-counter">
              <button onClick={() => setEditForm({ ...editForm, people: Math.max(0, editForm.people - 1) })}>
                −
              </button>
              <span>{editForm.people}</span>
              <button onClick={() => setEditForm({ ...editForm, people: editForm.people + 1 })}>
                +
              </button>
            </div>
            <div className="ww-modal-actions">
              <button className="ww-modal-cancel-btn" onClick={() => setShowEditTrip(false)}>
                {t("cancel")}
              </button>
              <button className="ww-lets-go-btn" onClick={handleSaveTripInfo}>
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditBudget && (
        <div className="ww-modal-overlay" onClick={() => setShowEditBudget(false)}>
          <div className="ww-planning-form ww-modal-card" onClick={(e) => e.stopPropagation()}>
            <h1 className="ww-planning-title">{t("editBudget")}</h1>
            <label className="ww-planning-label">{t("totalBudgetLabel")}</label>
            <input
              type="number"
              min="0"
              className="ww-planning-input"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
            />
            <div className="ww-modal-actions">
              <button className="ww-modal-cancel-btn" onClick={() => setShowEditBudget(false)}>
                {t("cancel")}
              </button>
              <button className="ww-lets-go-btn" onClick={handleSaveBudget}>
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="ww-modal-overlay" onClick={() => setPendingDelete(null)}>
          <div className="ww-warning-modal-card" onClick={(e) => e.stopPropagation()}>
            <p className="ww-warning-modal-icon">⚠️</p>
            <p className="ww-warning-modal-text">{t("deleteSectionTitle")}</p>
            <p className="ww-warning-modal-subtext">
              {t("deleteSectionWarning")}
            </p>
            <button className="ww-warning-modal-ok-btn" onClick={confirmPendingDelete}>
              {t("ok")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}