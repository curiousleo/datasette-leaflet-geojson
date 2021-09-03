document.addEventListener("DOMContentLoaded", () => {
  const loadDependencies = (callback) => {
    let loaded = 0;
    function hasLoaded() {
      loaded += 1;
      if (loaded == 3) {
        // GoogleMutant requires Leaflet and Google Maps.
        import("https://unpkg.com/leaflet.gridlayer.googlemutant@0.13.4/dist/Leaflet.GoogleMutant.js")
          .then(callback);
      }
    }
    let leafletStylesheet = document.createElement("link");
    leafletStylesheet.setAttribute("rel", "stylesheet");
    leafletStylesheet.setAttribute("href", datasette.leaflet.CSS_URL);
    leafletStylesheet.onload = hasLoaded;
    document.head.appendChild(leafletStylesheet);
    let googleMapsScript = document.createElement("script");
    googleMapsScript.setAttribute("src", "https://maps.googleapis.com/maps/api/js?key=" + window.GOOGLE_API_KEY);
    googleMapsScript.async = true;
    googleMapsScript.onload = hasLoaded;
    document.head.appendChild(googleMapsScript);
    import(datasette.leaflet.JAVASCRIPT_URL).then(hasLoaded);
  };
  const getFullNodeText = (el) => {
    // https://stackoverflow.com/a/4412151
    if (!el) {
      return "";
    }
    if (typeof el.textContent != "undefined") {
      return el.textContent;
    }
    return el.firstChild.nodeValue;
  };
  const types = new Set([
    "Point",
    "MultiPoint",
    "LineString",
    "MultiLineString",
    "Polygon",
    "MultiPolygon",
    "GeometryCollection",
    "Feature",
    "FeatureCollection",
  ]);

  function upgradeTd({ td, data }, activate) {
    // OK, it should be GeoJSON - display it with leaflet
    let el = document.createElement("div");
    el.style.width = "100%";
    el.style.minWidth = "400px";
    el.style.height = "100%";
    el.style.minHeight = "400px";
    el.style.backgroundColor = "#eee";
    while (td.firstChild) {
      td.removeChild(td.firstChild);
    }
    td.appendChild(el);
    function addMap() {
      let map = L.map(el, {
        layers: [
          L.gridLayer.googleMutant({
            type: "satellite",
          }),
        ],
      });
      let layer = L.geoJSON(data);
      layer.addTo(map);
      map.fitBounds(layer.getBounds(), {
        maxZoom: 18,
      });
    }
    if (activate) {
      addMap();
    } else {
      let a = document.createElement("a");
      a.innerHTML = "Click to show map";
      a.href = "#";
      a.style.color = "#666";
      a.style.display = "flex";
      a.style.justifyContent = "center";
      a.style.alignItems = "center";
      a.style.height = "400px";
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        a.parentNode.removeChild(a);
        addMap();
      });
      el.appendChild(a);
    }
  }
  // Only execute on table, query and row pages
  if (document.querySelector("table.rows-and-columns")) {
    let tds = document.querySelectorAll("table.rows-and-columns td");
    let tdsToUpgrade = [];
    Array.from(tds)
      .filter(
        (td) =>
          td.firstChild &&
          td.firstChild.nodeValue &&
          td.firstChild.nodeValue.trim().indexOf("{") === 0
      )
      .forEach((td) => {
        let data;
        try {
          data = JSON.parse(getFullNodeText(td));
        } catch {
          return;
        }
        if (!types.has(data.type)) {
          return;
        }
        tdsToUpgrade.push({
          td: td,
          data: data,
        });
      });
    if (tdsToUpgrade.length) {
      loadDependencies(() => {
        let numDone = 0;
        tdsToUpgrade.forEach((item) => {
          upgradeTd(
            item,
            numDone < window.DATASETTE_LEAFLET_GEOJSON_DEFAULT_MAPS_TO_LOAD
          );
          numDone += 1;
        });
      });
    }
    window.dispatchEvent(new Event("resize"));
  }
});
