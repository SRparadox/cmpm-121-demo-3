import "./style.css";

//Title of the App
const app: HTMLDivElement = document.querySelector("#app")!;

const gameName = "Demo3";
document.title = gameName;

// Button HERE
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("myButton");
  if (button) {
    button.addEventListener("click", () => {
      console.log("Button was clicked!");
      alert("Button clicked!");
    });
  } else {
    console.error("Button not found!");
  }
});

const header = document.createElement("h1");
header.innerHTML = gameName;
app.append(header);