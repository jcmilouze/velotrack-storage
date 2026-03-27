const polyline = require('@mapbox/polyline');

(async () => {
    try {
        const wps = [
            [2.3522, 48.8566], // 1
            [2.3600, 48.8600], // 2
            [2.3300, 48.8400], // 3
            [2.3522, 48.8566]  // 4 (loop)
        ];
        
        const query = {
            locations: wps.map((p, index) => ({
                lat: p[1],
                lon: p[0],
                type: (index === 0 || index === wps.length - 1) ? 'break' : 'through',
                radius: 2000
            })),
            costing: 'bicycle',
            units: 'kilometers'
        };

        const url = `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(query))}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (!res.ok) {
            console.error("Valhalla error:", data);
            return;
        }

        const snappedLocations = [];
        if (data.trip.legs.length > 0) {
            const firstCoords = polyline.decode(data.trip.legs[0].shape, 6);
            snappedLocations.push([firstCoords[0][1], firstCoords[0][0]]);
            for (const leg of data.trip.legs) {
                const coords = polyline.decode(leg.shape, 6);
                snappedLocations.push([coords[coords.length - 1][1], coords[coords.length - 1][0]]);
            }
        }
        console.log("Snapped locations length:", snappedLocations.length);
        console.log("Original waypoints length:", wps.length);
    } catch (e) {
        console.error(e);
    }
})();
