const fetch = require('http'); // no built-in node-fetch needed for http if we use fetch directly in 22
const polyline = require('@mapbox/polyline');

(async () => {
    try {
        const query = {
            "locations":[{"lat":48.8566,"lon":2.3522},{"lat":48.8600,"lon":2.3600},{"lat":48.8700,"lon":2.3400}],
            "costing":"bicycle"
        };
        const url = `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(query))}`;
        const res = await fetch(url);
        const data = await res.json();
        
        const snapped = [];
        data.trip.legs.forEach((leg, i) => {
            const coords = polyline.decode(leg.shape, 6);
            if (i === 0) {
                snapped.push([coords[0][1], coords[0][0]]); // lon, lat
            }
            snapped.push([coords[coords.length-1][1], coords[coords.length-1][0]]);
        });
        console.log("Input locations:", query.locations.map(l => [l.lon, l.lat]));
        console.log("Snapped locations:", snapped);
    } catch (e) {
        console.error(e);
    }
})();
