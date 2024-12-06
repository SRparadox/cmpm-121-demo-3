// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

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
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
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
let playerCoins: Array<{ x: number; y: number }> = [];
let playerPoints = playerCoins.length;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No coins yet...";

// Function to generate caches
function CacheGrid() {
    for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
        for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
        const currentCords = `${i},${j}`;
        const deterministicRandom = luck(currentCords);

        if (deterministicRandom < CACHE_SPAWN_PROBABILITY) {
            spawnMarker(i, j);
        }
        }
    }
}

//Spawn a marker at the location of the coords provided. It displays a pop up with the retrieve and deposit button and displays local coins
function spawnMarker(i: number, j: number) {
    const lat = OAKES_CLASSROOM.lat + i * TILE_DEGREES;
    const lng = OAKES_CLASSROOM.lng + j * TILE_DEGREES;
    const position = leaflet.latLng(lat, lng);

    let localCoins: Array<{ x: number; y: number }> = [];
    generateLocalCoins(i, j, localCoins);

    const cacheMarker = leaflet.marker(position);

    const popupContent = document.createElement("div");
    const coinCountDisplay = document.createElement("p");
    const coinListDisplay = document.createElement("p"); // For displaying coin coordinates
    const retrieveButton = document.createElement("button");
    const depositButton = document.createElement("button");

    retrieveButton.textContent = "Retrieve";
    depositButton.textContent = "Deposit";
    coinCountDisplay.textContent = `Coins: ${localCoins.length}`;

    // Display the coordinates of the coins
    const updateCoinListDisplay = () => {
        if (localCoins.length === 0) {
            coinListDisplay.textContent = "No coins in this cache.";
        } else {
            coinListDisplay.textContent = `Coin Coordinates: ${localCoins
                .map((coin) => `(${coin.x}, ${coin.y})`)
                .join(", ")}`;
        }
    };
    updateCoinListDisplay();

    retrieveButton.addEventListener("click", () => {
        retrieveCoin(i, j, localCoins);
        coinCountDisplay.textContent = `Coins: ${localCoins.length}`;
        updateCoinListDisplay();
    });

    depositButton.addEventListener("click", () => {
        depositCoin(i, j, localCoins);
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

//Function to give the coin of a local marker to the player
function retrieveCoin(i: number, j: number, localCoins: Array<{ x: number; y: number }>) {
    const coinIndex = localCoins.findIndex((coin) => coin.x === i && coin.y === j);
    if (coinIndex !== -1) {
        const [retrievedCoin] = localCoins.splice(coinIndex, 1);
        playerCoins.push(retrievedCoin);
        playerPoints = playerCoins.length;
        updateStatusPanel();
    } else {
        alert("No coins available to retrieve at this cache.");
    }
}

//Function gives a player coin to the local marker's coins
function depositCoin(i: number, j: number, localCoins: Array<{ x: number; y: number }>) {
    if (playerCoins.length > 0) {
        // Remove a coin from the player's collection
        const [depositedCoin] = playerCoins.splice(0, 1);
        // Add the coin to the cache's local coins without altering its coordinates
        localCoins.push(depositedCoin);
        // Update player points and status panel
        playerPoints = playerCoins.length;
        updateStatusPanel();
    } else {
        alert("You have no coins to deposit.");
    }
}

//Using luck to generate a random amount of local coins
function generateLocalCoins(i: number, j: number, localCoins: Array<{ x: number; y: number }>) {
    const temp1 = Math.floor(luck([i, j, "key"].toString()) * 21);
    for (let count = 0; count < temp1; count++) {
        localCoins.push({ x: i, y: j });
    }
}

//Update the UI for coins
function updateStatusPanel() {
    if (playerPoints > 0) {
        statusPanel.innerHTML = `You have ${playerPoints} coin(s).`;
        displayCoins(playerCoins);
    } else {
        statusPanel.innerHTML = "No coins yet...";
    }
}

//Display the array of coins
function displayCoins(coins: Array<{ x: number; y: number }>) {
    if (coins.length === 0) {
        statusPanel.innerHTML = "No coins available to display.";
        return;
    }
    const coinList = coins
        .map((coin) => `(${coin.x}, ${coin.y})`)
        .join(", ");
    statusPanel.innerHTML = `Coins: ${coinList}`;
}

// Call Functions
CacheGrid();
