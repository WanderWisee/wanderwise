// Pagpasa ng napiling lokasyon mula sa Pin screen pabalik sa trip screen
// (iisang app, kaya sapat na ang isang callback).
let handler = null;

export function startPinPicker(onPicked) {
  handler = onPicked;
}

export function finishPinPicker(coords) {
  const fn = handler;
  handler = null;
  if (fn && coords) fn(coords);
}
