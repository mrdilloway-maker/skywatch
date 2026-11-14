import { BootstrapScene } from './scenes/BootstrapScene.js';
import { SceneManager } from './scenes/SceneManager.js';
import { GameDataStore } from './stores/GameDataStore.js';
import { GameRulesStore } from './stores/GameRulesStore.js';
import { SavedDataGateway } from './stores/SavedDataGateway.js';
import { StringsStore } from './stores/StringsStore.js';

/**
 * Options passed in to start the game
 */
interface SetupParams
{
	container: HTMLElement;
	targetFps: number;
}

/**
 * Creates the strings, game rules, game data, saved games gateway and scene manager, shows the bootstrap scene and starts the frame loop
 */
export default async function setup(params: SetupParams): Promise<void>
{
	// Create the strings, game rules and game data stores and the saved games gateway
	const stringsStore     = new StringsStore();
	const gameRulesStore   = new GameRulesStore();
	const gameDataStore    = new GameDataStore();
	const savedDataGateway = new SavedDataGateway();

	// Create the scene manager and show the bootstrap scene
	const sceneManager = new SceneManager({
		stringsStore,
		gameRulesStore,
		gameDataStore,
		savedDataGateway,
		container: params.container,
	});
	await sceneManager.push(BootstrapScene);

	// Set up the fixed-step frame loop
	const frameDelay          = 1_000 / params.targetFps;
	let frameDelta: number    = 0;
	let previousTicks: number = window.performance.now();
	const update              = async (currentTicks: number): Promise<void> => {
		// Calculate the time since the previous frame
		const deltaTime = currentTicks - previousTicks;
		previousTicks   = currentTicks;

		// Add it to the time owed, capped to avoid a long catch-up
		frameDelta += deltaTime;
		frameDelta  = Math.min(frameDelta, frameDelay * 5);

		// Run a fixed step for each step owed, logging any error so the loop keeps going
		try
		{
			if (frameDelay <= frameDelta)
			{
				while (frameDelay <= frameDelta)
				{
					frameDelta -= frameDelay;
					await sceneManager.update(frameDelay);
				}

				await sceneManager.render();
			}
		}
		catch (error)
		{
			console.error(error);
		}

		// Queue the next frame
		window.requestAnimationFrame(update);
	};
	window.requestAnimationFrame(update);
}
