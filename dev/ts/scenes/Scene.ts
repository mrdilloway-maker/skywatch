import type { GameDataStore } from '../model/GameDataStore.js';
import type { GameRulesStore } from '../model/GameRulesStore.js';
import type { StringsStore } from '../model/StringsStore.js';
import type { SavedDataGateway } from '../services/SavedDataGateway.js';
import type { SceneManager } from '../services/SceneManager.js';

/**
 * Constructor signature for a scene class
 */
export type SceneConstructor = (new (params: SceneParams) => Scene);

/**
 * Options for creating a scene
 */
export interface SceneParams
{
	gameDataStore: GameDataStore;
	gameRulesStore: GameRulesStore;
	stringsStore: StringsStore;
	savedDataGateway: SavedDataGateway;
	pushScene: (sceneConstructor: SceneConstructor) => Promise<void>;
	popScene: () => Promise<void>;
	clearScenes: () => Promise<void>;
}

/**
 * Base class for a screen managed by the scene manager
 */
export abstract class Scene extends HTMLElement
{
	// Closed shadow root holding the scene's markup
	readonly #shadowRoot: ShadowRoot;

	// Game data the scene reads
	readonly #gameDataStore: GameDataStore;

	// Game rules the scene reads
	readonly #gameRulesStore: GameRulesStore;

	// Translated strings the scene shows
	readonly #stringsStore: StringsStore;

	// Reads and writes the saved games
	readonly #savedDataGateway: SavedDataGateway;

	// Aborts the listeners added since the last enter
	#abortController: AbortController|undefined;

	// Pushes a scene onto the scene manager's stack
	readonly #pushScene: (sceneConstructor: SceneConstructor) => Promise<void>;

	// Pops the top scene off the scene manager's stack
	readonly #popScene: () => Promise<void>;

	// Removes every scene from the scene manager's stack
	readonly #clearScenes: () => Promise<void>;

	/**
	 * Attaches the shadow root and stores the game data, the game rules, the strings, the saved games gateway and the scene manager's stack operations
	 */
	constructor(params: SceneParams)
	{
		super();

		// Attach a closed shadow root
		this.#shadowRoot = this.attachShadow({ mode: 'closed' });

		// Store the game data, rules, strings and saved games gateway
		this.#gameDataStore    = params.gameDataStore;
		this.#gameRulesStore   = params.gameRulesStore;
		this.#stringsStore     = params.stringsStore;
		this.#savedDataGateway = params.savedDataGateway;

		// Store the stack operations
		this.#pushScene   = params.pushScene;
		this.#popScene    = params.popScene;
		this.#clearScenes = params.clearScenes;
	}

	/**
	 * Advances the scene by one fixed step
	 */
	async update(_deltaTime: number): Promise<void>
	{
		// Do something
	}

	/**
	 * Draws the scene's current state
	 */
	async render(): Promise<void>
	{
		// Do something
	}

	/**
	 * Called when the scene is pushed onto the stack
	 */
	async enter(): Promise<void>
	{
		// Remove any listeners left from a previous enter and start a new controller
		this.#abortController?.abort();
		this.#abortController = new AbortController();

		// Let the subclass set up, passing the signal for its listeners
		const signal = this.#abortController.signal;
		await this._onEnter(signal);
	}

	/**
	 * Called when another scene is pushed on top
	 */
	async pause(): Promise<void>
	{
		this.inert = true;
		await this._onPause();
	}

	/**
	 * Called when the scene becomes the top scene again
	 */
	async resume(): Promise<void>
	{
		this.inert = false;
		await this._onResume();
	}

	/**
	 * Called when the scene is removed from the stack
	 */
	async exit(): Promise<void>
	{
		// Remove every listener added with the signal
		this.#abortController?.abort();
		this.#abortController = undefined;

		// Let the subclass clean up
		await this._onExit();
	}

	/**
	 * Called when the scene is pushed onto the stack
	 */
	protected async _onEnter(_signal: AbortSignal): Promise<void>
	{
		// Do something
	}

	/**
	 * Called when another scene is pushed on top
	 */
	protected async _onPause(): Promise<void>
	{
		// Do something
	}

	/**
	 * Called when the scene becomes the top scene again
	 */
	protected async _onResume(): Promise<void>
	{
		// Do something
	}

	/**
	 * Called when the scene is removed from the stack
	 */
	protected async _onExit(): Promise<void>
	{
		// Do something
	}

	/**
	 * Copies the template into the shadow root and fills every element marked with a string ID with its translated text
	 */
	protected _renderTemplate(template: HTMLTemplateElement): void
	{
		// Copy the template into the shadow root
		this._shadowRoot.append(template.content.cloneNode(true));

		// Set each marked element's text from the strings store
		const els = [...this._shadowRoot.querySelectorAll('[data-string]')] as HTMLElement[];
		els.forEach((el: HTMLElement): void => {
			const stringKey = String(el.dataset.string ?? '');
			el.textContent  = this.#stringsStore.get(stringKey);
		});
	}

	/**
	 * Gives subclasses the scene manager's push, pop and clear
	 */
	protected get _scenes(): Pick<SceneManager, 'push' | 'pop' | 'clear'>
	{
		return {
			push: this.#pushScene,
			pop: this.#popScene,
			clear: this.#clearScenes,
		};
	}

	/**
	 * Gives subclasses access to the shadow root
	 */
	protected get _shadowRoot(): ShadowRoot
	{
		return this.#shadowRoot;
	}

	/**
	 * Gives subclasses access to the game data
	 */
	protected get _data(): GameDataStore
	{
		return this.#gameDataStore;
	}

	/**
	 * Gives subclasses access to the game rules
	 */
	protected get _rules(): GameRulesStore
	{
		return this.#gameRulesStore;
	}

	/**
	 * Gives subclasses access to the strings
	 */
	protected get _strings(): StringsStore
	{
		return this.#stringsStore;
	}

	/**
	 * Gives subclasses access to the saved games
	 */
	protected get _saves(): SavedDataGateway
	{
		return this.#savedDataGateway;
	}
}
