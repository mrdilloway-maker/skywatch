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
		this._renderTemplate(SaveGameScene.#template);
	}

	/**
	 * Builds the list of save slots and listens for clicks on the cancel and slot buttons
	 */
	protected override async _onEnter(signal: AbortSignal): Promise<void>
	{
		// Handle every button click from the shadow root
		this._shadowRoot.addEventListener('click', this.#cancelButtonClicked.bind(this), { signal });
		this._shadowRoot.addEventListener('click', this.#savedGameSlotButtonClicked.bind(this), { signal });

		// Show the save slots
		try
		{
			await this.#renderSlots();
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
	 * Saves the game to the clicked slot and refreshes the list of save slots
	 */
	async #savedGameSlotButtonClicked(event: Event): Promise<void>
	{
		// Ignore clicks that didn't come from an element
		const targetEl = event.target;
		if (!(targetEl instanceof HTMLElement)) return;

		// Ignore clicks outside a save slot button
		const buttonEl = targetEl.closest('button[data-action="save-to-slot"][data-slot]');
		if (!(buttonEl instanceof HTMLElement)) return;

		// Read the slot from the button, which was built from the gateway's slot list, and name the save
		const slotIndex = Number(buttonEl.dataset.slot) as SaveSlotIndex;
		const slotName  = this.#generateSlotName();

		// Block further clicks while saving the game and refreshing the slots
		try
		{
			this.inert = true;
			await this._saves.save(slotIndex, slotName, this._data.toData());
			await this.#renderSlots();
		}
		catch (error)
		{
			console.error(error);
		}
		finally
		{
			this.inert = false;
		}
	}

	/**
	 * Fills the list with an item for each save slot: a save button, or an overwrite button if the slot is in use, and the save name
	 */
	async #renderSlots(): Promise<void>
	{
		// Build a list item for each save slot
		const slots   = await this._saves.list();
		const itemEls = slots.map(({ slot, name }: { slot: SaveSlotIndex; name: string|null }): HTMLLIElement => {
			const buttonEl          = document.createElement('button');
			buttonEl.dataset.action = 'save-to-slot';
			buttonEl.dataset.slot   = String(slot);
			buttonEl.textContent    = this._strings.get(null === name ? 'STR_SAVE' : 'STR_OVERWRITE');

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

	/**
	 * Returns a save name from the current real-world date and time, e.g. "14 Nov 2026 15:52"
	 */
	#generateSlotName(): string
	{
		// Read the current local date and time parts
		const now     = new Date();
		const day     = now.getDate();
		const month   = now.toLocaleDateString('en-GB', { month: 'short' });
		const year    = now.getFullYear();
		const hours   = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');

		// Return the parts joined into the save name
		return `${day} ${month} ${year} ${hours}:${minutes}`;
	}
}

// Register the scene as a custom element
window.customElements.define('save-game-scene', SaveGameScene);
