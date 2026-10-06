// Parehong listahan ng destinations na nasa web (TravelTipsPage at
// HotelsPage), kasama ang parehong mga larawan mula sa web/public/assets.
// Tinatayang coordinates lang ito — para sa mga pin sa mapa ng Home.

export const DESTINATIONS = [
  { name: 'Boracay, Aklan', image: require('../assets/destinations/boracay.jpg'), lat: 11.9674, lon: 121.9248 },
  { name: 'El Nido, Palawan', image: require('../assets/destinations/el-nido.jpg'), lat: 11.1956, lon: 119.4075 },
  { name: 'Baguio City', image: require('../assets/destinations/baguio.jpg'), lat: 16.4023, lon: 120.596 },
  { name: 'Siargao Island', image: require('../assets/destinations/siargao.jpg'), lat: 9.8482, lon: 126.0458 },
  { name: 'Chocolate Hills, Bohol', image: require('../assets/destinations/bohol.jpg'), lat: 9.8297, lon: 124.1397 },
  { name: 'Vigan, Ilocos Sur', image: require('../assets/destinations/vigan.jpg'), lat: 17.5747, lon: 120.3869 },
  { name: 'Coron, Palawan', image: require('../assets/destinations/coron.jpg'), lat: 11.9986, lon: 120.2043 },
  { name: 'Sagada, Mountain Province', image: require('../assets/destinations/sagada.jpg'), lat: 17.0833, lon: 120.9 },
  { name: 'San Juan, La Union', image: require('../assets/destinations/la-union.jpg'), lat: 16.6698, lon: 120.3405 },
  { name: 'Cebu City', image: require('../assets/destinations/cebu.jpg'), lat: 10.3157, lon: 123.8854 },
  { name: 'Tagaytay, Cavite', image: require('../assets/destinations/tagaytay.jpg'), lat: 14.1153, lon: 120.9621 },
];

// Ang Guides tab ng web ay ito lang ang ipinapakita (walang La Union, Cebu, Tagaytay).
export const GUIDE_DESTINATIONS = DESTINATIONS.filter(
  (d) => !['San Juan, La Union', 'Cebu City', 'Tagaytay, Cavite'].includes(d.name)
);

// Ang Hotels tab ng web: walang Chocolate Hills at Sagada.
export const HOTEL_DESTINATIONS = DESTINATIONS.filter(
  (d) => !['Chocolate Hills, Bohol', 'Sagada, Mountain Province'].includes(d.name)
);

// "Baguio City" -> "Baguio", "Siargao Island" -> "Siargao", "El Nido, Palawan" -> "El Nido"
export function keywordFor(destName) {
  return String(destName || '')
    .split(',')[0]
    .replace(/\b(city|islands?)\b/gi, '')
    .trim();
}

// Hanapin ang lokal na larawan para sa isang destination (hal. trip.destination).
export function localImageFor(destination) {
  const text = String(destination || '').toLowerCase();
  if (!text) return null;
  const head = text.split(',')[0].trim();
  const match = DESTINATIONS.find((d) => {
    const kw = keywordFor(d.name).toLowerCase();
    return kw && (text.includes(kw) || (head.length >= 4 && kw.includes(head)));
  });
  return match ? match.image : null;
}
