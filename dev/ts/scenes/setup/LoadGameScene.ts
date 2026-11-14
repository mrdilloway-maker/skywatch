import { Scene } from '../Scene.js';

import type { SceneParams } from '../Scene.js';

/**
 * Screen for loading a saved game
 */
export class LoadGameScene extends Scene
{
	// Markup shared by every load game scene instance
	static readonly #template: HTMLTemplateElement = Object.assign(
		document.createElement('template'),
		{
			innerHTML: `
				<h1 data-string="STR_LOAD_GAME"></h1>
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
		this._renderTemplate(LoadGameScene.#template);
	}

	/**
	 * Listens for clicks on the cancel button
	 */
	protected override async _onEnter(signal: AbortSignal): Promise<void>
	{
		// Handle every button click from the shadow root
		this._shadowRoot.addEventListener('click', this.#cancelButtonClicked.bind(this), { signal });
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
window.customElements.define('load-game-scene', LoadGameScene);
