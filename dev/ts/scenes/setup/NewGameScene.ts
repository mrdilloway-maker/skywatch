import { GeoscapeScene } from '../geoscape/GeoscapeScene.js';
import { Scene } from '../Scene.js';
import { MainMenuScene } from './MainMenuScene.js';

import type { GameData } from '../../model/GameDataStore.js';
import type { SceneParams } from '../Scene.js';

/**
 * Screen for starting a new game
 */
export class NewGameScene extends Scene
{
	// Markup shared by every new game scene instance
	static readonly #template: HTMLTemplateElement = Object.assign(
		document.createElement('template'),
		{
			innerHTML: `
				<h1 data-string="STR_NEW_GAME"></h1>

				<div>
					<button data-action="start-game" data-difficulty="1" data-string="STR_BEGINNER"></button>
					<button data-action="start-game" data-difficulty="2" data-string="STR_NOVICE"></button>
					<button data-action="start-game" data-difficulty="3" data-string="STR_EXPERT"></button>
				</div>

				<button data-action="goto-previous" data-string="STR_CANCEL"></button>
			`,
		},
	);

	/**
	 * Builds the scene from its template
	 */
	constructor(params: SceneParams)
	{
		super(params);

		// Copy the markup into the shadow root
		this._renderTemplate(NewGameScene.#template);
	}

	/**
	 * Listens for clicks on the cancel and difficulty buttons
	 */
	protected override async _onEnter(signal: AbortSignal): Promise<void>
	{
		// Handle every button click from the shadow root
		this._shadowRoot.addEventListener('click', this.#cancelButtonClicked.bind(this), { signal });
		this._shadowRoot.addEventListener('click', this.#difficultyButtonClicked.bind(this), { signal });
	}

	/**
	 * Loads a new game at the chosen difficulty and starts it on the Geoscape
	 */
	async #difficultyButtonClicked(event: Event): Promise<void>
	{
		// Ignore clicks that didn't come from an element
		const targetEl = event.target;
		if (!(targetEl instanceof HTMLElement)) return;

		// Ignore clicks outside a difficulty button
		const buttonEl = targetEl.closest('button[data-action="start-game"][data-difficulty]');
		if (!(buttonEl instanceof HTMLElement)) return;

		// Load the new game and replace the stack with the Geoscape
		try
		{
			// Block further clicks
			this.inert = true;

			// Load the new game data into the store
			const response = await fetch('/data/new-game.json');
			if (!response.ok) throw new Error('Failed to load new game data');
			const gameData = await response.json() as GameData;
			this._data.load(gameData);

			// Store the chosen difficulty
			this._data.difficulty = Number(buttonEl.dataset.difficulty);

			// Replace the stack with the Geoscape
			await this._scenes.clear();
			await this._scenes.push(GeoscapeScene);
		}
		catch (error)
		{
			// Log the failure and fall back to the main menu
			console.error(error);
			await this._scenes.clear();
			await this._scenes.push(MainMenuScene);
		}
	}

	/**
	 * Returns to the previous scene when the cancel button is clicked
	 */
	async #cancelButtonClicked(event: Event): Promise<void>
	{
		// Ignore clicks that didn't come from an element
		const targetEl = event.target;
		if (!(targetEl instanceof HTMLElement)) return;

		// Ignore clicks outside the cancel button
		const buttonEl = targetEl.closest('button[data-action="goto-previous"]');
		if (!(buttonEl instanceof HTMLElement)) return;

		// Block further clicks and return to the previous scene
		try
		{
			this.inert = true;
			await this._scenes.pop();
		}
		catch (error)
		{
			console.error(error);
			this.inert = false;
		}
	}
}

// Register the scene as a custom element
window.customElements.define('new-game-scene', NewGameScene);
