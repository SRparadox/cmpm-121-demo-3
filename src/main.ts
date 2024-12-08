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

// Save data to local storage
//Asked brace how to use localStorage and save states
//Used CHATGPT to fix an error where had to add globalTHis
function saveGameState() {
  const gameState = {
    playerPosition: playerMarker.getLatLng(),
    playerCoins,
    markerStates: Array.from(markerStateCache.entries()),
  };
  globalThis.localStorage.setItem("gameState", JSON.stringify(gameState));
}

function loadGameState() {
  const savedState = globalThis.localStorage.getItem("gameState");
  if (savedState) {
    const { playerPosition, playerCoins: savedCoins, markerStates } = JSON
      .parse(savedState);

    // Restore player position
    playerMarker.setLatLng(playerPosition);
    map.panTo(playerPosition);

    // Restore player coins
    playerCoins.length = 0;
    playerCoins.push(...savedCoins);

    // Restore marker states
    markerStateCache.clear();
    for (const [key, state] of markerStates) {
      markerStateCache.set(
        key,
        new MarkerState(state.i, state.j, state.numCoins),
      );
    }

    // Regenerate the grid to apply restored markers
    CacheGrid(playerPosition.lat, playerPosition.lng);
    updateStatusPanel();
  }
}

// Reset game state function
function resetGameState() {
  // Confirm with the user before resetting
  const userConfirmation = prompt(
    "Are you sure you want to erase your game state? Type 'YES' to confirm.",
  );

  if (userConfirmation !== "YES") {
    alert("Game reset canceled.");
    return;
  }

  // Stop geolocation tracking if active
  const sensorButton = document.getElementById("sensor") as HTMLButtonElement;
  const isTracking = sensorButton?.dataset.tracking === "true";

  if (isTracking) {
    const watchId = Number(sensorButton.dataset.watchId);
    navigator.geolocation.clearWatch(watchId);
    sensorButton.textContent = "Enable Geolocation";
    sensorButton.dataset.tracking = "false";
  }

  // Clear player coins
  playerCoins.length = 0;

  // Clear marker state cache
  markerStateCache.clear();

  // Reset player position to the initial location
  playerMarker.setLatLng(OAKES_CLASSROOM);
  map.panTo(OAKES_CLASSROOM);

  // Regenerate the cache grid around the initial position
  CacheGrid(globalLat, globalLng);

  // Update the status panel
  updateStatusPanel();

  // Clear localStorage
  globalThis.localStorage.removeItem("gameState");

  alert("Game state has been reset!");
}

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
  saveGameState(); // Save after position update
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

// Add an event listener for the reset button
document.getElementById("reset")?.addEventListener("click", resetGameState);

// Add event listener for enabling/disabling geolocation-based position updates
//Used ChatGPT for help regarding the tracking and geolocation logics due to me not being familiar with how to use them.
//Sensor generates a grid around the newly given player coords, also added a way to stop geotracking
document.getElementById("sensor")?.addEventListener("click", function () {
  const button = this as HTMLButtonElement;
  const isTracking = button.dataset.tracking === "true";

  if (!isTracking) {
    // Start geolocation tracking
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    button.textContent = "Stop Geolocation";
    button.dataset.tracking = "true";

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Update player's position to current geolocation
        playerMarker.setLatLng([latitude, longitude]);
        map.panTo([latitude, longitude]);

        // Generate markers immediately around the new position
        CacheGrid(latitude, longitude);
      },
      (error) => {
        console.error("Error retrieving geolocation:", error);
        alert("Unable to retrieve your location.");
      },
      {
        enableHighAccuracy: true, // Use GPS if available
      },
    );

    // Store watchId to clear later
    button.dataset.watchId = String(watchId);

    // Trigger immediate marker generation using the current player position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Update player's position and generate markers
        playerMarker.setLatLng([latitude, longitude]);
        map.panTo([latitude, longitude]);
        CacheGrid(latitude, longitude);
      },
      (error) => {
        console.error("Error retrieving initial geolocation:", error);
        alert("Unable to retrieve your initial location.");
      },
      {
        enableHighAccuracy: true,
      },
    );
  } else {
    // Stop geolocation tracking
    const watchId = Number(button.dataset.watchId);
    navigator.geolocation.clearWatch(watchId);
    button.textContent = "Enable Geolocation";
    button.dataset.tracking = "false";
  }
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

// Define the Memento interface
// Used the example given in the slides for reference. Used Brace to explain what and ow Momento worked, and used ChatGPT for how to create interfaces
interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

// Define MarkerState to save and restore marker data
class MarkerState implements Momento<string> {
  i: number;
  j: number;
  numCoins: number;

  constructor(i: number, j: number, numCoins: number) {
    this.i = i;
    this.j = j;
    this.numCoins = numCoins;
  }

  toMomento(): string {
    return JSON.stringify({ i: this.i, j: this.j, numCoins: this.numCoins });
  }

  fromMomento(momento: string): void {
    const state = JSON.parse(momento);
    this.i = state.i;
    this.j = state.j;
    this.numCoins = state.numCoins;
  }
}

// Flyweight storage for marker states
const markerStateCache = new Map<string, MarkerState>();

// Update CacheGrid to save and restore states
function CacheGrid(centerLat: number, centerLng: number) {
  map.eachLayer((layer) => {
    if (layer instanceof leaflet.Marker && layer !== playerMarker) {
      const position = layer.getLatLng();
      const key = `${position.lat},${position.lng}`;
      const coins = retrieveMarkerCoins(layer);

      markerStateCache.set(
        key,
        new MarkerState(position.lat, position.lng, coins.length),
      );
      map.removeLayer(layer);
    }
  });

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
      const key = `${i},${j}`;

      if (markerStateCache.has(key)) {
        const state = markerStateCache.get(key)!;
        spawnMarker(state.i, state.j, state.numCoins);
      } else {
        const deterministicRandom = luck(`${i},${j}`);
        if (deterministicRandom < CACHE_SPAWN_PROBABILITY) {
          spawnMarker(i, j);
        }
      }
    }
  }
}

//Added the ability to
function spawnMarker(i: number, j: number, numCoins: number = 0) {
  // Use Flyweight for coordinates
  const position = LatLngFlyweight.get(i, j);
  const localCoins: Array<{ i: number; j: number; serial: number }> = [];

  // Populate local coins from the state or generate new ones
  if (numCoins != 0) {
    for (let serial = 1; serial <= numCoins; serial++) {
      localCoins.push({ i, j, serial });
    }
  } else {
    generateLocalCoins(i, j, localCoins);
  }

  // Create a cache marker at the position
  const cacheMarker = leaflet.marker(position);

  // Create popup content elements
  const popupContent = document.createElement("div");
  const coinCountDisplay = document.createElement("p");
  const coinListDisplay = document.createElement("p");
  const retrieveButton = document.createElement("button");
  const depositButton = document.createElement("button");

  // Setup the initial state of the popup
  retrieveButton.textContent = "Retrieve";
  depositButton.textContent = "Deposit";
  coinCountDisplay.textContent = `Coins: ${localCoins.length}`;

  const updateCoinListDisplay = () => {
    if (localCoins.length === 0) {
      coinListDisplay.textContent = "No coins in this cache.";
    } else {
      coinListDisplay.textContent = `Coin Coordinates: ${
        localCoins
          .map((coin) => `{i: ${coin.i}, j: ${coin.j}, serial: ${coin.serial}}`)
          .join(", ")
      }`;
    }
  };
  updateCoinListDisplay();

  // Event handler to retrieve a coin
  retrieveButton.addEventListener("click", () => {
    retrieveCoin(localCoins);
    coinCountDisplay.textContent = `Coins: ${localCoins.length}`;
    updateCoinListDisplay();
  });

  // Event handler to deposit a coin
  depositButton.addEventListener("click", () => {
    depositCoin(localCoins);
    coinCountDisplay.textContent = `Coins: ${localCoins.length}`;
    updateCoinListDisplay();
  });

  // Assemble popup content
  popupContent.appendChild(coinCountDisplay);
  popupContent.appendChild(coinListDisplay);
  popupContent.appendChild(retrieveButton);
  popupContent.appendChild(depositButton);

  // Bind popup to the cache marker
  cacheMarker.bindPopup(popupContent);

  // Ensure the popup updates when opened
  cacheMarker.on("popupopen", () => {
    coinCountDisplay.textContent = `Coins: ${localCoins.length}`;
    updateCoinListDisplay();
  });

  // Add the cache marker to the map
  cacheMarker.addTo(map);
}

// Auto-save upon coin retrieval or deposit
function retrieveCoin(
  localCoins: Array<{ i: number; j: number; serial: number }>,
) {
  if (localCoins.length > 0) {
    const [retrievedCoin] = localCoins.splice(0, 1);
    playerCoins.push(retrievedCoin);
    playerPoints = playerCoins.length;
    updateStatusPanel();
    saveGameState(); // Save after coin retrieval
  } else {
    alert("No coins available to retrieve at this cache.");
  }
}

function depositCoin(
  localCoins: Array<{ i: number; j: number; serial: number }>,
) {
  if (playerCoins.length > 0) {
    const [depositedCoin] = playerCoins.splice(0, 1);
    localCoins.push(depositedCoin);
    playerPoints = playerCoins.length;
    updateStatusPanel();
    saveGameState(); // Save after coin deposit
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

// Helper to retrieve coins from a marker (if applicable)
function retrieveMarkerCoins(marker: leaflet.Marker): Array<number> {
  const popupContent = marker.getPopup()?.getContent();
  if (popupContent instanceof HTMLDivElement) {
    const coinListDisplay = popupContent.querySelector("p:last-child");
    if (coinListDisplay) {
      // Extract coin list from the display
      const coins = JSON.parse(coinListDisplay.textContent || "[]");
      return coins;
    }
  }
  return [];
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

// Load state on game initialization
globalThis.addEventListener("load", () => {
  loadGameState();
});

// Save state when the game is closed
globalThis.addEventListener("beforeunload", () => {
  saveGameState();
});
