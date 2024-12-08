// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// Global latitude and longitude
const globalLat = 36.98949379578401;
const globalLng = -122.06277128548504;

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(globalLat, globalLng);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Define a custom icon for the player making it red
const redIcon = leaflet.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Add a marker to represent the player with the red icon
const playerMarker = leaflet.marker(OAKES_CLASSROOM, { icon: redIcon });
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Display the player's coins
const playerCoins: Array<{ i: number; j: number; serial: number }> = [];
let playerPoints = playerCoins.length;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No coins yet...";

// Update Player Position to new coords
// Used ChatGPT to for help in the logic on how to use pan to and create new offset coords
function PlayerPosChange(latOffset: number, lngOffset: number) {
  // Update player's position
  const newLat = playerMarker.getLatLng().lat + latOffset;
  const newLng = playerMarker.getLatLng().lng + lngOffset;

  // Update player marker's position
  playerMarker.setLatLng([newLat, newLng]);

  // Center the map on the new position
  map.panTo([newLat, newLng]);

  // Regenerate visible cache locations
  CacheGrid(newLat, newLng);
}

//Move up
document.getElementById("north")?.addEventListener("click", () => {
  PlayerPosChange(TILE_DEGREES, 0);
});

//Move down
document.getElementById("south")?.addEventListener("click", () => {
  PlayerPosChange(-TILE_DEGREES, 0);
});

//Move Right
document.getElementById("east")?.addEventListener("click", () => {
  PlayerPosChange(0, TILE_DEGREES);
});

//Move Left
document.getElementById("west")?.addEventListener("click", () => {
  PlayerPosChange(0, -TILE_DEGREES);
});

// Flyweight factory to manage unique latitude-longitude pairs
const LatLngFlyweight = (() => {
  const cache: Record<string, { lat: number; lng: number }> = {};

  return {
    get: (lat: number, lng: number) => {
      const key = `${lat},${lng}`;
      if (!cache[key]) {
        cache[key] = { lat, lng };
      }
      return cache[key];
    },
  };
})();

// Update CacheGrid to generate caches dynamically around the player
function CacheGrid(centerLat: number, centerLng: number) {
  // Clear existing markers
  map.eachLayer((layer) => {
    if (layer instanceof leaflet.Marker && layer !== playerMarker) {
      map.removeLayer(layer);
    }
  });

  // Generate new caches around the updated position
  for (
    let latOffset = -NEIGHBORHOOD_SIZE;
    latOffset < NEIGHBORHOOD_SIZE;
    latOffset++
  ) {
    for (
      let lngOffset = -NEIGHBORHOOD_SIZE;
      lngOffset < NEIGHBORHOOD_SIZE;
      lngOffset++
    ) {
      const i = parseFloat(
        (centerLat + latOffset * TILE_DEGREES).toFixed(4),
      );
      const j = parseFloat(
        (centerLng + lngOffset * TILE_DEGREES).toFixed(4),
      );
      const currentCords = `${i},${j}`;
      const deterministicRandom = luck(currentCords);

      if (deterministicRandom < CACHE_SPAWN_PROBABILITY) {
        spawnMarker(i, j);
      }
    }
  }
}

// Refactored spawnMarker function to use Flyweight for position
function spawnMarker(i: number, j: number) {
  const position = LatLngFlyweight.get(i, j); // Use Flyweight for coordinates
  const localCoins: Array<{ i: number; j: number; serial: number }> = [];
  generateLocalCoins(i, j, localCoins);

  const cacheMarker = leaflet.marker(position);

  const popupContent = document.createElement("div");
  const coinCountDisplay = document.createElement("p");
  const coinListDisplay = document.createElement("p");
  const retrieveButton = document.createElement("button");
  const depositButton = document.createElement("button");

  retrieveButton.textContent = "Retrieve";
  depositButton.textContent = "Deposit";
  coinCountDisplay.textContent = `Coins: ${localCoins.length}`;

  const updateCoinListDisplay = () => {
    if (localCoins.length === 0) {
      coinListDisplay.textContent = "No coins in this cache.";
    } else {
      coinListDisplay.textContent = `Coin Coordinates: ${
        localCoins
          .map(
            (coin) => `{i: ${coin.i}, j: ${coin.j}, serial: ${coin.serial}}`,
          )
          .join(", ")
      }`;
    }
  };
  updateCoinListDisplay();

  retrieveButton.addEventListener("click", () => {
    retrieveCoin(localCoins);
    coinCountDisplay.textContent = `Coins: ${localCoins.length}`;
    updateCoinListDisplay();
  });

  depositButton.addEventListener("click", () => {
    depositCoin(localCoins);
    coinCountDisplay.textContent = `Coins: ${localCoins.length}`;
    updateCoinListDisplay();
  });

  popupContent.appendChild(coinCountDisplay);
  popupContent.appendChild(coinListDisplay);
  popupContent.appendChild(retrieveButton);
  popupContent.appendChild(depositButton);

  cacheMarker.bindPopup(popupContent);

  cacheMarker.on("popupopen", () => {
    coinCountDisplay.textContent = `Coins: ${localCoins.length}`;
    updateCoinListDisplay();
  });

  cacheMarker.addTo(map);
}

// Retrieve a coin from the local marker
function retrieveCoin(
  localCoins: Array<{ i: number; j: number; serial: number }>,
) {
  if (localCoins.length > 0) {
    const [retrievedCoin] = localCoins.splice(0, 1);
    playerCoins.push(retrievedCoin);
    playerPoints = playerCoins.length;
    updateStatusPanel();
  } else {
    alert("No coins available to retrieve at this cache.");
  }
}

// Deposit a player coin into the local marker's coins
function depositCoin(
  localCoins: Array<{ i: number; j: number; serial: number }>,
) {
  if (playerCoins.length > 0) {
    const [depositedCoin] = playerCoins.splice(0, 1);
    localCoins.push(depositedCoin);
    playerPoints = playerCoins.length;
    updateStatusPanel();
  } else {
    alert("You have no coins to deposit.");
  }
}

// Generate coins for a specific marker
function generateLocalCoins(
  i: number,
  j: number,
  localCoins: Array<{ i: number; j: number; serial: number }>,
) {
  const temp1 = Math.floor(luck([i, j, "key"].toString()) * 20) + 1;
  for (let count = 0; count < temp1; count++) {
    localCoins.push({ i, j, serial: count + 1 });
  }
}

// Update the status panel with player's coins
function updateStatusPanel() {
  if (playerPoints > 0) {
    statusPanel.innerHTML = `You have ${playerPoints} coin(s).`;
    displayCoins(playerCoins);
  } else {
    statusPanel.innerHTML = "No coins yet...";
  }
}

// Display the player's coins
function displayCoins(coins: Array<{ i: number; j: number; serial: number }>) {
  if (coins.length === 0) {
    statusPanel.innerHTML = "No coins available to display.";
    return;
  }
  const coinList = coins
    .map((coin) => `{i: ${coin.i}, j: ${coin.j}, serial: ${coin.serial}}`)
    .join(", ");
  statusPanel.innerHTML = `Coins: ${coinList}`;
}
// Call Functions
CacheGrid(globalLat, globalLng);
