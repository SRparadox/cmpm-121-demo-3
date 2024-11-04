import "./style.css";

// DOM Variables
const buttons = new Map<string, HTMLButtonElement>();

// Function to create and add a button
function createButton() {
  // Create a new button element
  const button = document.createElement('button');
  button.textContent = 'Click Me';

  // Add an event listener to alert when clicked
  button.addEventListener('click', () => {
    alert('You clicked the button!');
  });

  // Find the container to append the button
  const container = document.getElementById('button-container');
  if (container) {
    container.appendChild(button);
  } else {
    console.error('Container element not found!');
  }

  // Optionally add the button to the buttons map
  buttons.set('myButton', button);
}

// Call the function to create and add the button
createButton();