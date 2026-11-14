import { GeoscapeScene } from './GeoscapeScene.js';
import { Scene } from './Scene.js';

import type { SaveSlotIndex } from '../stores/SavedDataGateway.js';
import type { SceneParams } from './Scene.js';

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

				<ul id="game-slots"></ul>

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
	 * Builds the list of save slots and listens for clicks on the cancel and slot buttons
	 */
	protected override async _onEnter(signal: AbortSignal): Promise<void>
	{
		// Handle every button click from the shadow root
		this._shadowRoot.addEventListener('click', this.#cancelButtonClicked.bind(this), { signal });
		this._shadowRoot.addEventListener('click', this.#loadGameSlotButtonClicked.bind(this), { signal });

		// Build a list item for each save slot with a load button, disabled if the slot is empty
		try
		{
			const slots   = await this._saves.list();
			const itemEls = slots.map(({ slot, name }: { slot: SaveSlotIndex; name: string|null }): HTMLLIElement => {
				const buttonEl          = document.createElement('button');
				buttonEl.dataset.action = 'load-from-slot';
				buttonEl.dataset.slot   = String(slot);
				buttonEl.textContent    = this._strings.get('STR_LOAD');
				buttonEl.disabled       = null === name;

				// Show the save name, or that the slot is empty, next to the button
				const nameEl       = document.createElement('span');
				nameEl.textContent = name ?? this._strings.get('STR_EMPTY_SLOT');

				// Return the button and name wrapped in a list item
				const itemEl = document.createElement('li');
				itemEl.append(buttonEl, nameEl);
				return itemEl;
			});

			// Replace the list's contents with the slot items
			this._shadowRoot.getElementById('game-slots')?.replaceChildren(...itemEls);
		}
		catch (error)
		{
			console.error(error);
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

	/**
	 * Loads the game from the clicked slot and starts it on the Geoscape
	 */
	async #loadGameSlotButtonClicked(event: Event): Promise<void>
	{
		// Ignore clicks that didn't come from an element
		const targetEl = event.target;
		if (!(targetEl instanceof HTMLElement)) return;

		// Ignore clicks outside a load button
		const buttonEl = targetEl.closest('button[data-action="load-from-slot"][data-slot]');
		if (!(buttonEl instanceof HTMLElement)) return;

		// Read the slot from the button, which was built from the gateway's slot list
		const slotIndex = Number(buttonEl.dataset.slot) as SaveSlotIndex;

		// Block further clicks, load the saved game into the store and replace the stack with the Geoscape
		try
		{
			this.inert = true;
			this._data.load(await this._saves.load(slotIndex));
			await this._scenes.clear();
			await this._scenes.push(GeoscapeScene);
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
