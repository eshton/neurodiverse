// Budapest + the 19 Hungarian counties (megyék), for the location selector on the
// map-first homepage. Coordinates are the county seat's center (or Budapest's center),
// not a precise administrative boundary — good enough to recenter/zoom the map to a
// region, not for geofencing. Zoom values pick a level that shows the county's rough
// extent without cutting off neighboring pins too aggressively.

export interface CountyOption {
  name: string;
  center: { lat: number; lng: number };
  zoom: number;
}

export const COUNTIES: CountyOption[] = [
  { name: 'Budapest', center: { lat: 47.4979, lng: 19.0402 }, zoom: 11 },
  { name: 'Bács-Kiskun', center: { lat: 46.9088395, lng: 19.6727475 }, zoom: 9 },
  { name: 'Baranya', center: { lat: 46.0703109, lng: 18.2224522 }, zoom: 9 },
  { name: 'Békés', center: { lat: 46.6798003, lng: 21.0985425 }, zoom: 9 },
  { name: 'Borsod-Abaúj-Zemplén', center: { lat: 48.1208833, lng: 20.7910364 }, zoom: 9 },
  { name: 'Csongrád-Csanád', center: { lat: 46.2530, lng: 20.1414 }, zoom: 9 },
  { name: 'Fejér', center: { lat: 47.1981647, lng: 18.4129586 }, zoom: 9 },
  { name: 'Győr-Moson-Sopron', center: { lat: 47.6704203, lng: 17.6495406 }, zoom: 9 },
  { name: 'Hajdú-Bihar', center: { lat: 47.5370308, lng: 21.6220505 }, zoom: 9 },
  { name: 'Heves', center: { lat: 47.9191806, lng: 20.3719647 }, zoom: 9 },
  { name: 'Jász-Nagykun-Szolnok', center: { lat: 47.1519911, lng: 20.1671829 }, zoom: 9 },
  { name: 'Komárom-Esztergom', center: { lat: 47.5838450, lng: 18.3979855 }, zoom: 9 },
  { name: 'Nógrád', center: { lat: 48.1113371, lng: 19.8114074 }, zoom: 9 },
  { name: 'Pest', center: { lat: 47.3772495, lng: 18.9213833 }, zoom: 9 },
  { name: 'Somogy', center: { lat: 46.3594908, lng: 17.7990007 }, zoom: 9 },
  { name: 'Szabolcs-Szatmár-Bereg', center: { lat: 47.9518488, lng: 21.7237966 }, zoom: 9 },
  { name: 'Tolna', center: { lat: 46.3538567, lng: 18.7122706 }, zoom: 9 },
  { name: 'Vas', center: { lat: 47.2291184, lng: 16.6187625 }, zoom: 9 },
  { name: 'Veszprém', center: { lat: 47.0895743, lng: 17.9070184 }, zoom: 9 },
  { name: 'Zala', center: { lat: 46.8428527, lng: 16.8438836 }, zoom: 9 },
];
