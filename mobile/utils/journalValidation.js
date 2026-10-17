export function journalEntryHasContent(entry) {
  return !!(
    entry.photoData || entry.photoUri || entry.placeName?.trim() || entry.description?.trim()
    || entry.rating > 0 || entry.pros?.length || entry.cons?.length
    || entry.prosInput?.trim() || entry.consInput?.trim()
  );
}

export function journalEntriesMissingPhotos(entries) {
  return entries.filter((entry) => journalEntryHasContent(entry) && !entry.photoData && !entry.photoUri);
}
