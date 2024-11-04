import "./style.css";

// Find the container where you want to insert the button
const container = document.getElementById('your-container-id');

// Create a button element
const button = document.createElement('button');

// Set button text content
button.textContent = 'Click Me!';

// Attach an event listener to the button to show an alert message
button.addEventListener('click', () => {
  alert('You clicked the button!');
});

// Make sure the container exists, then append the button to it
if (container) {
  container.appendChild(button);
} else {
  console.error('Container element not found');
}