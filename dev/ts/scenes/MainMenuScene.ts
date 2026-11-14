import { LoadGameScene } from './LoadGameScene.js';
import { NewGameScene } from './NewGameScene.js';
import { Scene } from './Scene.js';

import type { SceneParams } from './Scene.js';

/**
 * Main menu, leading to the new game and load game scenes
 */
export class MainMenuScene extends Scene
{
	// Markup shared by every main menu scene instance
	static readonly #template: HTMLTemplateElement = Object.assign(
		document.createElement('template'),
		{
			innerHTML: `
				<h1 data-string="STR_MAIN_MENU"></h1>
				<button data-action="goto-new-game" data-string="STR_NEW_GAME"></button>
				<button data-action="goto-load-game" data-string="STR_LOAD_GAME"></button>
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
		this._renderTemplate(MainMenuScene.#template);
	}

	/**
	 * Wires the buttons to the new game and load game scenes
	 */
	protected override async _onEnter(signal: AbortSignal): Promise<void>
	{
		// Handle every button click from the shadow root
		this._shadowRoot.addEventListener('click', this.#newGameButtonClicked.bind(this), { signal });
		this._shadowRoot.addEventListener('click', this.#loadGameButtonClicked.bind(this), { signal });
	}

	/**
	 * Pushes the new game scene when the new game button is clicked
	 */
	async #newGameButtonClicked(event: Event): Promise<void>
	{
		// Ignore clicks that didn't come from an element
		const targetEl = event.target;
		if (!(targetEl instanceof HTMLElement)) return;

		// Ignore clicks outside the new game button
		const buttonEl = targetEl.closest('button[data-action="goto-new-game"]');
		if (!(buttonEl instanceof HTMLElement)) return;

		// Block further clicks and push the new game scene
		try
		{
			this.inert = true;
			await this._scenes.push(NewGameScene);
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
window.customElements.define('main-menu-scene', MainMenuScene);
