import { Scene } from '../Scene.js';
import { LoadGameScene } from '../setup/LoadGameScene.js';
import { SaveGameScene } from '../setup/SaveGameScene.js';

import type { SceneParams } from '../Scene.js';

/**
 * Geoscape options, leading to the save game and load game scenes
 */
export class GeoscapeOptionsScene extends Scene
{
	// Markup shared by every Geoscape options scene instance
	static readonly #template: HTMLTemplateElement = Object.assign(
		document.createElement('template'),
		{
			innerHTML: `
				<h1 data-string="STR_OPTIONS"></h1>
				<button data-action="goto-save-game" data-string="STR_SAVE_GAME"></button>
				<button data-action="goto-load-game" data-string="STR_LOAD_GAME"></button>
				<button data-action="goto-previous" data-string="STR_BACK"></button>
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
		this._renderTemplate(GeoscapeOptionsScene.#template);
	}

	/**
	 * Listens for clicks on the back, save game and load game buttons
	 */
	protected override async _onEnter(signal: AbortSignal): Promise<void>
	{
		// Handle every button click from the shadow root
		this._shadowRoot.addEventListener('click', this.#backButtonClicked.bind(this), { signal });
		this._shadowRoot.addEventListener('click', this.#saveGameButtonClicked.bind(this), { signal });
		this._shadowRoot.addEventListener('click', this.#loadGameButtonClicked.bind(this), { signal });
	}

	/**
	 * Returns to the previous scene when the back button is clicked
	 */
	async #backButtonClicked(event: Event): Promise<void>
	{
		// Ignore clicks that didn't come from an element
		const targetEl = event.target;
		if (!(targetEl instanceof HTMLElement)) return;

		// Ignore clicks outside the back button
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

	/**
	 * Pushes the save game scene when the save game button is clicked
	 */
	async #saveGameButtonClicked(event: Event): Promise<void>
	{
		// Ignore clicks that didn't come from an element
		const targetEl = event.target;
		if (!(targetEl instanceof HTMLElement)) return;

		// Ignore clicks outside the save game button
		const buttonEl = targetEl.closest('button[data-action="goto-save-game"]');
		if (!(buttonEl instanceof HTMLElement)) return;

		// Block further clicks and push the save game scene
		try
		{
			this.inert = true;
			await this._scenes.push(SaveGameScene);
		}
		catch (error)
		{
			console.error(error);
			this.inert = false;
		}
	}

	/**
	 * Pushes the load game scene when the load game button is clicked
	 */
	async #loadGameButtonClicked(event: Event): Promise<void>
	{
		// Ignore clicks that didn't come from an element
		const targetEl = event.target;
		if (!(targetEl instanceof HTMLElement)) return;

		// Ignore clicks outside the load game button
		const buttonEl = targetEl.closest('button[data-action="goto-load-game"]');
		if (!(buttonEl instanceof HTMLElement)) return;

		// Block further clicks and push the load game scene
		try
		{
			this.inert = true;
			await this._scenes.push(LoadGameScene);
		}
		catch (error)
		{
			console.error(error);
			this.inert = false;
		}
	}
}

// Register the scene as a custom element
window.customElements.define('geoscape-options-scene', GeoscapeOptionsScene);
