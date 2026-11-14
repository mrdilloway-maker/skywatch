import { Scene } from './Scene.js';

import type { SaveSlotIndex } from '../stores/SavedDataGateway.js';
import type { SceneParams } from './Scene.js';

/**
 * Screen for saving the current game
 */
export class SaveGameScene extends Scene
{
	// Markup shared by every save game scene instance
	static readonly #template: HTMLTemplateElement = Object.assign(
		document.createElement('template'),
		{
			innerHTML: `
				<h1 data-string="STR_SAVE_GAME"></h1>

				<ul id="save-slots"></ul>

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
		this._renderTemplate(SaveGameScene.#template);
	}

	/**
	 * Builds the list of save slots and listens for clicks on the cancel button
	 */
	protected override async _onEnter(signal: AbortSignal): Promise<void>
	{
		// Handle every button click from the shadow root
		this._shadowRoot.addEventListener('click', this.#cancelButtonClicked.bind(this), { signal });

		// Build a list item and button for each save slot, showing its save name or that it's empty
		try
		{
			const slots   = await this._saves.list();
			const itemEls = slots.map(({ slot, name }: { slot: SaveSlotIndex; name: string|null }): HTMLLIElement => {
				const buttonEl          = document.createElement('button');
				buttonEl.dataset.action = 'save-to-slot';
				buttonEl.dataset.slot   = String(slot);
				buttonEl.textContent    = name ?? this._strings.get('STR_EMPTY_SLOT');

				// Return the button wrapped in a list item
				const itemEl = document.createElement('li');
				itemEl.append(buttonEl);
				return itemEl;
			});

			// Replace the list's contents with the slot items
			this._shadowRoot.getElementById('save-slots')?.replaceChildren(...itemEls);
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
}

// Register the scene as a custom element
window.customElements.define('save-game-scene', SaveGameScene);
