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
const playerCoins: Array<{ x: number; y: number; pos: number }> = [];
let playerPoints = playerCoins.length;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No coins yet...";

// Updated CacheGrid function to use lat and lng instead of i and j
function CacheGrid() {
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
      const lat = OAKES_CLASSROOM.lat + latOffset * TILE_DEGREES;
      const lng = OAKES_CLASSROOM.lng + lngOffset * TILE_DEGREES;
      const currentCords = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      const deterministicRandom = luck(currentCords);

      if (deterministicRandom < CACHE_SPAWN_PROBABILITY) {
        spawnMarker(lat, lng);
      }
    }
  }
}
// Updated spawnMarker function to display global lng and lat as i and j
function spawnMarker(lat: number, lng: number) {
  const position = leaflet.latLng(lat, lng);
  const localCoins: Array<{ x: number; y: number; pos: number }> = [];
  generateLocalCoins(lat, lng, localCoins);

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
          .map((coin) => `(${coin.x}, ${coin.y}, ${coin.pos})`)
          .join(", ")
      }`;
    }
  };
  updateCoinListDisplay();

  retrieveButton.addEventListener("click", () => {
    retrieveCoin(lat, lng, localCoins);
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

//Function to give the coin of a local marker to the player.
function retrieveCoin(
  i: number,
  j: number,
  localCoins: Array<{ x: number; y: number; pos: number }>,
) {
  const coinIndex = localCoins.findIndex((coin) =>
    coin.x === i && coin.y === j
  );
  if (coinIndex !== -1) {
    const [retrievedCoin] = localCoins.splice(coinIndex, 1); // Retrieve the coin
    playerCoins.push(retrievedCoin); // Add it to player coins
    playerPoints = playerCoins.length;
    updateStatusPanel();
  } else {
    alert("No coins available to retrieve at this cache.");
  }
}

// Function to deposit a player coin into the local marker's coins
function depositCoin(localCoins: Array<{ x: number; y: number; pos: number }>) {
  if (playerCoins.length > 0) {
    // Remove the first coin from the player's collection
    const [depositedCoin] = playerCoins.splice(0, 1);

    // Add the coin to the local cache
    localCoins.push(depositedCoin);

    // Update player points and status panel
    playerPoints = playerCoins.length;
    updateStatusPanel();
  } else {
    alert("You have no coins to deposit.");
  }
}

// Updated function to generate local coins with positions
function generateLocalCoins(
  i: number,
  j: number,
  localCoins: Array<{ x: number; y: number; pos: number }>,
) {
  const temp1 = Math.floor(luck([i, j, "key"].toString()) * 20) + 1;
  for (let count = 0; count < temp1; count++) {
    localCoins.push({ x: i, y: j, pos: count + 1 }); // Add position as `count + 1`
  }
}

// Update the UI for coins
function updateStatusPanel() {
  if (playerPoints > 0) {
    statusPanel.innerHTML = `You have ${playerPoints} coin(s).`;
    displayCoins(playerCoins);
  } else {
    statusPanel.innerHTML = "No coins yet...";
  }
}

// Display the array of coins with their full details
function displayCoins(coins: Array<{ x: number; y: number; pos: number }>) {
  if (coins.length === 0) {
    statusPanel.innerHTML = "No coins available to display.";
    return;
  }
  const coinList = coins
    .map((coin) => `(${coin.x}, ${coin.y}, ${coin.pos})`) // Include `pos` in the display
    .join(", ");
  statusPanel.innerHTML = `Coins: ${coinList}`;
}

// Call Functions
CacheGrid();
