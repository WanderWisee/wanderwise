# WanderWise Mobile (React Native / Expo)

Ang mobile app ng WanderWise. Iisang backend (`/backend`, .NET) at iisang
database ang gamit ng web at mobile, kaya ang trip na ginawa sa phone ay
lalabas agad sa web, at kabaligtaran.

## Patakbuhin

1. **Backend** — sa laptop, buksan ito para maabot ng phone sa parehong Wi-Fi:

   ```bash
   cd backend
   dotnet run --launch-profile lan
   ```

   (Ang `lan` profile ay nakikinig sa `0.0.0.0:5269`. Ang `http` profile ay
   `localhost` lang, kaya hindi ito maaabot ng phone.) Kapag hindi pa rin
   maabot, payagan ang port 5269 sa Windows Firewall.

2. **Mobile**

   ```bash
   cd mobile
   npm install
   npx expo start
   ```

   I-scan ang QR code gamit ang Expo Go.

### Saan kumokonekta ang app?

Kusang ginagamit ng app ang IP ng laptop na nagpapatakbo ng `npx expo start`
(port 5269). Kung nasa ibang computer ang backend, o naka-deploy na ito,
gumawa ng `mobile/.env.local` (tingnan ang `.env.example`):

```
EXPO_PUBLIC_API_URL=http://192.168.1.151:5269/api
EXPO_PUBLIC_WEB_URL=http://192.168.1.151:3000
```

Pagkatapos baguhin, i-restart gamit ang `npx expo start -c`. Kailangan din ito
kapag gumagamit ng `npx expo start --tunnel`.

## Ayos ng code

| Folder | Laman |
| --- | --- |
| `app/` | Mga screen (Expo Router — ang file name ang route) |
| `services/api.js` | Iisang pinto papunta sa backend: token, timeout, error, 401 → Login |
| `services/*Service.js` | Mga tawag sa API, parehong endpoints ng web |
| `context/AppContext.js` | Session (`/api/me`), wika (en/fil), at preferences (`/api/me/settings`) |
| `context/DialogContext.js` | In-app na confirm/alert/toast (gumagana rin sa Expo web) |
| `components/ui.js` | Paulit-ulit na UI: header, buttons, field, avatar, empty/error state |
| `components/OsmMap.js` | Mapa gamit ang OpenStreetMap tiles (walang dagdag na library) |
| `i18n/translations.js` | **Kopya** ng `web/src/i18n/translations.js` — kapag binago sa web, kopyahin ulit dito |
| `i18n/mobileStrings.js` | Mga salitang pang-mobile lang |
| `constants/destinations.js` | Parehong listahan at larawan ng destinations ng web |

## Mga tala

- Ang `trip.title` ay ang pangalan ng "Where to go?" list (gaya sa web); ang
  pangalan ng trip na ipinapakita ay "Trip to &lt;destination&gt;".
- Ang mga larawan (profile, journal) ay ipinapadala bilang base64 data URL —
  parehong format ng web.
- Ang invite link ay `EXPO_PUBLIC_WEB_URL/trip-plan/join/<token>` — parehong
  link ng web. Sa phone, puwede rin itong i-paste sa Menu → "Join a trip".
