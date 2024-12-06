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
    iconSize: [25, 41], // Size of the icon
    iconAnchor: [12, 41], // Point of the icon which will correspond to marker's location
    popupAnchor: [1, -34], // Point from which the popup should open relative to the iconAnchor
    shadowSize: [41, 41], // Size of the shadow
});
  
// Add a marker to represent the player with the red icon
const playerMarker = leaflet.marker(OAKES_CLASSROOM, { icon: redIcon });
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);


// Display the player's points
let playerCoins = [];
let playerPoints = playerCoins.length;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No points yet...";


//Function to generate caches, via Luck(position) to make a determetically random position for caches
//Creates a grid of all the caches
function CacheGrid(){
    for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
        for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
            // If location i,j is lucky enough, spawn a cache!
            const currentCords = `${i},${j}`;
            const determenisticRandom = luck(currentCords);            

            if (determenisticRandom < CACHE_SPAWN_PROBABILITY) {
                spawnMarker(i, j);
            }
        }
    }
}

function spawnMarker(i: number, j: number) {
    // Calculate the new latitude and longitude for the grid position
    const lat = OAKES_CLASSROOM.lat + i * TILE_DEGREES;
    const lng = OAKES_CLASSROOM.lng + j * TILE_DEGREES;
    const position = leaflet.latLng(lat, lng);
    
    //Local Coin Amounts
    let localCoins = [];
    generateLocalCoins(i,j,localCoins);
    
    // Create a marker for the calculated position
    const cacheMarker = leaflet.marker(position);

    // Create a custom popup with buttons
    const popupContent = document.createElement("div");
    const retrieveButton = document.createElement("button");
    const depositButton = document.createElement("button");

    retrieveButton.textContent = "Retrieve";
    depositButton.textContent = "Deposit";

    // Bind a tooltip or popup to the marker
    cacheMarker.bindTooltip(`Coin at (${i}, ${j})`);

    // Add event listeners to the buttons
    retrieveButton.addEventListener("click", () => {
        retrieveCoin();
    });

    depositButton.addEventListener("click", () => {
        depositCoin();
    });

    // Append buttons to the popup content
    popupContent.appendChild(retrieveButton);
    popupContent.appendChild(depositButton);

    // Bind the custom popup to the marker
    cacheMarker.bindPopup(popupContent);

    // Add the marker to the map
    cacheMarker.addTo(map);
}

function retrieveCoin(){
    //Retrieve the (i,j) from LocalCoins and give it to playerCoins array
    //-1 localcoin (i,j) coin and +1 Playercoin and playerCoin[]
}

function depositCoin(){
    //Retrieve the (i,j) from LocalCoins and give it to playerCoins
    //-1 playerCoin, and add localCoins[(i,j)]
}

function generateLocalCoins(i,j,localCoins){
    //Using luck to spawn an amount of coins, each coin is (i,j), into the local array
}

//Call Functions
CacheGrid(); 
