import skywatch from './skywatch.js';

// Find the element the game runs in
const container = document.querySelector('#app');
if (!(container instanceof HTMLElement)) throw new Error('Container missing');

// Start the game in the container
skywatch({
	container,
	targetFps: 30,
});