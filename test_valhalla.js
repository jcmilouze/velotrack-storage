(async () => {
    try {
        const query = {
            "locations":[{"lat":48.8566,"lon":2.3522},{"lat":48.8600,"lon":2.3600}],
            "costing":"bicycle"
        };
        const url = `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(query))}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log(JSON.stringify(data.trip.locations, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
