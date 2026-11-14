/**
 * Constructor signature for a scene class
 */
type SceneConstructor = (new (params: SceneParams) => Scene);

/**
 * In-game milliseconds that pass per real second at each game speed
 */
enum GameSpeed
{
	PAUSED      = 0,
	FIVE_SECS   = 5_000,
	ONE_MIN     = 60_000,
	FIVE_MINS   = 300_000,
	THIRTY_MINS = 1_800_000,
	ONE_HOUR    = 3_600_000,
	ONE_DAY     = 86_400_000,
}








/**
 * Number of a save slot
 */
type SaveSlotIndex = 1 | 2 | 3;

/**
 * A saved game as stored in a save slot
 */
interface SavedData
{
	name: string;
	savedAt: number;
	gameData: GameData;
}

/**
 * Reads and writes saved games in localStorage
 */
class SavedDataGateway
{
	/**
	 * Writes the game data to a save slot under the given save name
	 */
	async save(slot: SaveSlotIndex, name: string, gameData: GameData): Promise<void>
	{
		// Build the saved game with the current time
		const payload: SavedData = {
			name,
			gameData,
			savedAt: Date.now(),
		};

		// Store it as JSON under the slot's key
		localStorage.setItem(`skywatch.save.${slot}`, JSON.stringify(payload));
	}

	/**
	 * Reads the game data from a save slot
	 */
	async load(slot: SaveSlotIndex): Promise<GameData>
	{
		// Read the slot and fail if it's empty
		const json = localStorage.getItem(`skywatch.save.${slot}`);
		if (null === json) throw new Error(`Save slot ${slot} is empty`);

		// Return the game data from the saved payload
		const payload = JSON.parse(json) as SavedData;
		return payload.gameData;
	}

	/**
	 * Returns every save slot in ascending order, with its save name or null if it's empty
	 */
	async list(): Promise<{ slot: SaveSlotIndex; name: string|null }[]>
	{
		// Every save slot, in order
		const allSlots: SaveSlotIndex[] = [1, 2, 3];

		// Return each slot with its save name, or null if nothing is stored
		return allSlots.map((slot: SaveSlotIndex): { slot: SaveSlotIndex; name: string|null } => {
			const json = localStorage.getItem(`skywatch.save.${slot}`);
			return { slot, name: null === json ? null : (JSON.parse(json) as SavedData).name };
		});
	}
}











/**
 * Holds the translated text strings, keyed by string ID
 */
class StringsStore
{
	// Translated text keyed by string ID
	readonly #strings: Map<string, string> = new Map();

	/**
	 * Fetches the strings file and stores its text keyed by string ID
	 */
	async load(): Promise<void>
	{
		// Fetch the strings file and fail if it can't be loaded
		const path     = '/data/strings/en.json';
		const response = await fetch(path);
		if (!response.ok) throw new Error(`Failed to load ${path}`);

		// Replace the stored strings with the file's entries
		const strings = await response.json() as Record<string, string>;
		this.#strings.clear();
		for (const [key, text] of Object.entries(strings)) this.#strings.set(key, text);
	}

	/**
	 * Returns the text for a string ID, or the ID itself if it has no text
	 */
	get(key: string): string
	{
		return this.#strings.get(key) ?? key;
	}
}







/**
 * A facility in the facilities ruleset
 */
interface FacilityRulesetEntry
{
	id: string;
	cost: number;
}

/**
 * A topic in the research ruleset
 */
interface ResearchRulesetEntry
{
	id: string;
	cost: number;
	points: number;
}

/**
 * An item in the items ruleset
 */
interface ItemRulesetEntry
{
	id: string;
	costBuy: number;
	costSell: number;
}

/**
 * Holds the static rules data loaded at boot
 */
class GameRulesStore
{
	// Facilities keyed by ID
	#facilities: Record<string, FacilityRulesetEntry> = {};

	// Items keyed by ID
	#items: Record<string, ItemRulesetEntry> = {};

	// Research topics keyed by ID
	#research: Record<string, ResearchRulesetEntry> = {};

	/**
	 * Fetches the ruleset files and stores each one keyed by ID
	 */
	async load(): Promise<void>
	{
		// Fetch all three rulesets at once
		const [facilities, items, research] = await Promise.all([
			this.#fetchRuleset<FacilityRulesetEntry>('facilities'),
			this.#fetchRuleset<ItemRulesetEntry>('items'),
			this.#fetchRuleset<ResearchRulesetEntry>('research'),
		]);

		// Store them once every file has loaded
		this.#facilities = facilities;
		this.#items      = items;
		this.#research   = research;
	}

	/**
	 * Facilities keyed by ID
	 */
	get facilities(): Record<string, FacilityRulesetEntry>
	{
		return this.#facilities;
	}

	/**
	 * Items keyed by ID
	 */
	get items(): Record<string, ItemRulesetEntry>
	{
		return this.#items;
	}

	/**
	 * Research topics keyed by ID
	 */
	get research(): Record<string, ResearchRulesetEntry>
	{
		return this.#research;
	}

	/**
	 * Fetches one ruleset file and keys its entries by ID
	 */
	async #fetchRuleset<Entry extends { id: string }>(name: string): Promise<Record<string, Entry>>
	{
		// Fetch the ruleset's entries
		const entries = await this.#fetchJson<Entry[]>(`/data/rulesets/${name}.json`);

		// Return the entries keyed by ID
		return Object.fromEntries(entries.map((entry: Entry): [string, Entry] => [entry.id, entry]));
	}

	/**
	 * Fetches and parses a JSON file
	 */
	async #fetchJson<Data>(path: string): Promise<Data>
	{
		// Fetch the file and fail if it can't be loaded
		const response = await fetch(path);
		if (!response.ok) throw new Error(`Failed to load ${path}`);

		// Return the parsed contents
		return await response.json() as Data;
	}
}




























/**
 * Plain game data, as loaded from a new game or a save
 */
interface GameData
{
	funds: number;
	date: number;
	difficulty: number;
}

/**
 * Holds the state of the current game
 */
class GameDataStore
{
	// Money available to spend
	funds: number = 0;

	// Current in-game date in milliseconds
	date: number = 0;

	// Chosen difficulty
	difficulty: number = 1;

	// In-game milliseconds that pass per real second
	#gameSpeed: GameSpeed = GameSpeed.PAUSED;

	/**
	 * Copies plain game data into the store and pauses the game
	 */
	load(gameData: GameData): void
	{
		// Start the loaded game paused
		this.#gameSpeed = GameSpeed.PAUSED;

		// Copy the loaded values
		this.funds      = gameData.funds;
		this.date       = gameData.date;
		this.difficulty = gameData.difficulty;
	}

	/**
	 * 
	 */
	toData(): GameData
	{
		return {
			funds: this.funds,
			date: this.date,
			difficulty: this.difficulty,
		};
	}

	/**
	 * Returns the current game speed
	 */
	get gameSpeed(): GameSpeed
	{
		return this.#gameSpeed;
	}

	/**
	 * Sets the current game speed, ignoring values that aren't a valid game speed
	 */
	set gameSpeed(gameSpeed: GameSpeed)
	{
		// Ignore values that aren't in the game speed enum
		if (!Object.values(GameSpeed).includes(gameSpeed)) return;

		this.#gameSpeed = gameSpeed;
	}
}



















/**
 * Options for creating a scene
 */
interface SceneParams
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
abstract class Scene extends HTMLElement
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









/**
 * First scene, which loads the strings and rulesets and hands over to the main menu
 */
class BootstrapScene extends Scene
{
	// Progress of the strings load
	#stringsStatus: 'loading' | 'loaded' | 'failed' = 'loading';

	// Progress of the ruleset load
	#rulesStatus: 'loading' | 'loaded' | 'failed' = 'loading';

	// Markup shared by every bootstrap scene instance
	static readonly #template: HTMLTemplateElement = Object.assign(
		document.createElement('template'),
		{
			innerHTML: `
				<h1>Loading</h1>
				<dl>
					<dt>Rulesets</dt>
					<dd id="rules-status"></dd>
					<dt>Translations</dt>
					<dd id="strings-status"></dd>
				</dl>
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
		this._renderTemplate(BootstrapScene.#template);
	}

	/**
	 * Starts loading the strings and rulesets
	 */
	protected override async _onEnter(_signal: AbortSignal): Promise<void>
	{
		// Load the strings and record the outcome
		this._strings.load()
			.then((): void => { this.#stringsStatus = 'loaded'; })
			.catch((error: unknown): void => {
				console.error(error);
				this.#stringsStatus = 'failed';
			});

		// Load the rulesets and record the outcome
		this._rules.load()
			.then((): void => { this.#rulesStatus = 'loaded'; })
			.catch((error: unknown): void => {
				console.error(error);
				this.#rulesStatus = 'failed';
			});
	}

	/**
	 * Hands over to the main menu once the strings and rulesets have loaded
	 */
	override async update(_deltaTime: number): Promise<void>
	{
		// Replace the stack with the main menu once everything has loaded
		if (
			'loaded' === this.#stringsStatus &&
			'loaded' === this.#rulesStatus
		)
		{
			await this._scenes.clear();
			await this._scenes.push(MainMenuScene);
		}
	}

	/**
	 * Shows the progress of the strings and ruleset loads
	 */
	override async render(): Promise<void>
	{
		// Show a symbol for the current ruleset status
		const rulesStatusEl = this._shadowRoot.getElementById('rules-status');
		if (rulesStatusEl instanceof HTMLElement)
		{
			switch (this.#rulesStatus)
			{
				case 'loading':
					rulesStatusEl.textContent = '?';
					break;
				case 'loaded':
					rulesStatusEl.textContent = '✔';
					break;
				case 'failed':
					rulesStatusEl.textContent = '✘';
					break;
			}
		}

		// Show a symbol for the current strings status
		const stringsStatusEl = this._shadowRoot.getElementById('strings-status');
		if (stringsStatusEl instanceof HTMLElement)
		{
			switch (this.#stringsStatus)
			{
				case 'loading':
					stringsStatusEl.textContent = '?';
					break;
				case 'loaded':
					stringsStatusEl.textContent = '✔';
					break;
				case 'failed':
					stringsStatusEl.textContent = '✘';
					break;
			}
		}
	}
}









/**
 * Main menu, leading to the new game and load game scenes
 */
class MainMenuScene extends Scene
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









/**
 * Screen for starting a new game
 */
class NewGameScene extends Scene
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









/**
 * Screen for loading a saved game
 */
class LoadGameScene extends Scene
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









/**
 * Screen for saving the current game
 */
class SaveGameScene extends Scene
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








/**
 * Geoscape scene
 */
class GeoscapeScene extends Scene
{
	// Markup shared by every Geoscape scene instance
	static readonly #template: HTMLTemplateElement = Object.assign(
		document.createElement('template'),
		{
			innerHTML: `
				<h1 data-string="STR_GEOSCAPE"></h1>

				<button data-action="goto-geoscape-options" data-string="STR_OPTIONS"></button>

				<div>
					<p>
						<span id="clock-hours">HOURS</span>
						<span id="clock-minutes">MINS</span>
						<span id="clock-seconds">SECONDS</span>
					</p>
					<p>
						<span id="clock-weekday">DAY</span>
					</p>
					<p>
						<span id="clock-date">DATE</span>
						<span id="clock-month">MONTH</span>
						<span id="clock-year">YEAR</span>
					</p>
				</div>

				<div>
					<button data-action="change-speed" data-speed="${GameSpeed.PAUSED}" data-string="STR_PAUSE"></button>
					<button data-action="change-speed" data-speed="${GameSpeed.FIVE_SECS}" data-string="STR_5_SECS"></button>
					<button data-action="change-speed" data-speed="${GameSpeed.ONE_MIN}" data-string="STR_1_MIN"></button>
					<button data-action="change-speed" data-speed="${GameSpeed.FIVE_MINS}" data-string="STR_5_MINS"></button>
					<button data-action="change-speed" data-speed="${GameSpeed.THIRTY_MINS}" data-string="STR_30_MINS"></button>
					<button data-action="change-speed" data-speed="${GameSpeed.ONE_HOUR}" data-string="STR_1_HOUR"></button>
					<button data-action="change-speed" data-speed="${GameSpeed.ONE_DAY}" data-string="STR_1_DAY"></button>
				</div>
			`,
		},
	);

	// Systems run by the Geoscape
	readonly #systemManager: SystemManager = new SystemManager();

	// Longest in-game time in milliseconds advanced per loop step, set to the lowest game speed
	readonly #minimumStep: number;

	/**
	 * Works out the step length, adds the systems in run order and builds the scene from its template
	 */
	constructor(params: SceneParams)
	{
		super(params);

		// Use the lowest non-zero game speed as the step length
		const speeds      = Object.values(GameSpeed).filter((value): value is number => 'number' === typeof value && 0 < value);
		this.#minimumStep = Math.min(...speeds);

		// Add the systems in run order
		const gameDataStore = this._data;
		this.#systemManager.add(new RadarDetectionSystem({ gameDataStore }));
		this.#systemManager.add(new SoldierRecoverySystem({ gameDataStore }));
		this.#systemManager.add(new PsiTrainingSystem({ gameDataStore }));

		// Copy the markup into the shadow root
		this._renderTemplate(GeoscapeScene.#template);
	}

	/**
	 * Advances the game date by one fixed step and runs each system update interval it crosses
	 */
	override async update(deltaTime: number): Promise<void>
	{
		// Lengths of the fixed system update intervals in milliseconds
		const fiveSeconds   = 5_000;
		const tenMinutes    = 600_000;
		const thirtyMinutes = 1_800_000;
		const oneHour       = 3_600_000;
		const oneDay        = 86_400_000;

		// Start from the current game date
		let workingDate = this._data.date;

		// Work out the next boundary of each system update interval
		let nextFiveSecondThreshold   = this.#calcNextThreshold(workingDate, fiveSeconds);
		let nextTenMinuteThreshold    = this.#calcNextThreshold(workingDate, tenMinutes);
		let nextThirtyMinuteThreshold = this.#calcNextThreshold(workingDate, thirtyMinutes);
		let nextHourThreshold         = this.#calcNextThreshold(workingDate, oneHour);
		let nextDayThreshold          = this.#calcNextThreshold(workingDate, oneDay);
		let nextMonthThreshold        = this.#calcNextMonthThreshold(workingDate);

		// Work out the in-game time to advance and advance it in steps no longer than the minimum step
		let dateDelta = (deltaTime / 1_000) * this._data.gameSpeed;
		while (0 < dateDelta)
		{
			// Advance the date by one step
			const step   = Math.min(dateDelta, this.#minimumStep);
			dateDelta   -= step;
			workingDate += step;

			// Handle the 5-second interval
			if (workingDate >= nextFiveSecondThreshold)
			{
				nextFiveSecondThreshold = this.#calcNextThreshold(workingDate, fiveSeconds);
				await this.#systemManager.everyFiveSeconds();
			}

			// Handle the 10-minute interval
			if (workingDate >= nextTenMinuteThreshold)
			{
				nextTenMinuteThreshold = this.#calcNextThreshold(workingDate, tenMinutes);
				await this.#systemManager.everyTenMinutes();
			}

			// Handle the 30-minute interval
			if (workingDate >= nextThirtyMinuteThreshold)
			{
				nextThirtyMinuteThreshold = this.#calcNextThreshold(workingDate, thirtyMinutes);
				await this.#systemManager.everyThirtyMinutes();
			}

			// Handle the hour interval
			if (workingDate >= nextHourThreshold)
			{
				nextHourThreshold = this.#calcNextThreshold(workingDate, oneHour);
				await this.#systemManager.everyHour();
			}

			// Handle the day interval
			if (workingDate >= nextDayThreshold)
			{
				nextDayThreshold = this.#calcNextThreshold(workingDate, oneDay);
				await this.#systemManager.everyDay();
			}

			// Handle the month interval
			if (workingDate >= nextMonthThreshold)
			{
				nextMonthThreshold = this.#calcNextMonthThreshold(workingDate);
				await this.#systemManager.everyMonth();
			}
		}

		// Store the new date
		this._data.date = workingDate;
	}

	/**
	 * Shows the current game date on the clock and marks the active game speed button
	 */
	override async render(): Promise<void>
	{
		this.#renderClock();
		this.#renderSpeedButtons();
	}

	/**
	 * Listens for clicks on the game speed and options buttons
	 */
	protected override async _onEnter(signal: AbortSignal): Promise<void>
	{
		// Handle every button click from the shadow root
		this._shadowRoot.addEventListener('click', this.#gameSpeedButtonClicked.bind(this), { signal });
		this._shadowRoot.addEventListener('click', this.#optionsButtonClicked.bind(this), { signal });
	}

	/**
	 * Pushes the Geoscape options scene when the options button is clicked
	 */
	async #optionsButtonClicked(event: Event): Promise<void>
	{
		// Ignore clicks that didn't come from an element
		const targetEl = event.target;
		if (!(targetEl instanceof HTMLElement)) return;

		// Ignore clicks outside the options button
		const buttonEl = targetEl.closest('button[data-action="goto-geoscape-options"]');
		if (!(buttonEl instanceof HTMLElement)) return;

		// Block further clicks and push the Geoscape options scene
		try
		{
			this.inert = true;
			await this._scenes.push(GeoscapeOptionsScene);
		}
		catch (error)
		{
			console.error(error);
			this.inert = false;
		}
	}

	/**
	 * Sets the game speed from the clicked game speed button
	 */
	#gameSpeedButtonClicked(event: Event): void
	{
		// Ignore clicks that didn't come from an element
		const targetEl = event.target;
		if (!(targetEl instanceof HTMLElement)) return;

		// Ignore clicks outside a game speed button
		const buttonEl = targetEl.closest('button[data-action="change-speed"][data-speed]');
		if (!(buttonEl instanceof HTMLElement)) return;

		// Set the game speed from the button's speed value
		const gameSpeed = Number(buttonEl.dataset.speed ?? 0);
		if (!Number.isNaN(gameSpeed)) this._data.gameSpeed = gameSpeed;
	}

	/**
	 * Returns the first boundary of the given interval after the given date
	 */
	#calcNextThreshold(date: number, interval: number): number
	{
		return (Math.floor(date / interval) + 1) * interval;
	}

	/**
	 * Returns the start of the next month (midnight UTC on the 1st) after the given date
	 */
	#calcNextMonthThreshold(date: number): number
	{
		const dateObj = new Date(date);
		return Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth() + 1, 1);
	}

	/**
	 * Writes the current game date into the clock elements
	 */
	#renderClock(): void
	{
		// Read the date parts in UTC
		const date    = new Date(this._data.date);
		const hours   = String(date.getUTCHours()).padStart(2, '0');
		const minutes = String(date.getUTCMinutes()).padStart(2, '0');
		const seconds = String(date.getUTCSeconds()).padStart(2, '0');
		const weekday = date.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });
		const month   = date.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });

		// Show the hours
		const clockHoursEl = this._shadowRoot.getElementById('clock-hours');
		if (clockHoursEl instanceof HTMLElement) clockHoursEl.textContent = hours;

		// Show the minutes
		const clockMinutesEl = this._shadowRoot.getElementById('clock-minutes');
		if (clockMinutesEl instanceof HTMLElement) clockMinutesEl.textContent = minutes;

		// Show the seconds
		const clockSecondsEl = this._shadowRoot.getElementById('clock-seconds');
		if (clockSecondsEl instanceof HTMLElement) clockSecondsEl.textContent = seconds;

		// Show the weekday
		const clockWeekdayEl = this._shadowRoot.getElementById('clock-weekday');
		if (clockWeekdayEl instanceof HTMLElement) clockWeekdayEl.textContent = weekday;

		// Show the day of the month
		const clockDateEl = this._shadowRoot.getElementById('clock-date');
		if (clockDateEl instanceof HTMLElement) clockDateEl.textContent = String(date.getUTCDate());

		// Show the month
		const clockMonthEl = this._shadowRoot.getElementById('clock-month');
		if (clockMonthEl instanceof HTMLElement) clockMonthEl.textContent = month;

		// Show the year
		const clockYearEl = this._shadowRoot.getElementById('clock-year');
		if (clockYearEl instanceof HTMLElement) clockYearEl.textContent = String(date.getUTCFullYear());
	}

	/**
	 * Marks the button for the current game speed as pressed
	 */
	#renderSpeedButtons(): void
	{
		// Set each speed button's pressed state from the current game speed
		const buttonEls = this._shadowRoot.querySelectorAll<HTMLElement>('button[data-action="change-speed"]');
		for (const buttonEl of buttonEls)
		{
			const isActive = Number(buttonEl.dataset.speed) === this._data.gameSpeed;
			buttonEl.setAttribute('aria-pressed', String(isActive));
		}
	}
}









/**
 * Geoscape options, leading to the save game and load game scenes
 */
class GeoscapeOptionsScene extends Scene
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











/**
 * Options for creating the scene manager
 */
interface SceneManagerParams
{
	container: HTMLElement;
	stringsStore: StringsStore;
	gameDataStore: GameDataStore;
	gameRulesStore: GameRulesStore;
	savedDataGateway: SavedDataGateway;
}

/**
 * Holds the scene stack and shows its scenes in the container
 */
class SceneManager
{
	// Element the scenes are added to
	readonly #container: HTMLElement;

	// Game data passed to each new scene
	readonly #gameDataStore: GameDataStore;

	// Game rules passed to each new scene
	readonly #gameRulesStore: GameRulesStore;

	// Strings passed to each new scene
	readonly #stringsStore: StringsStore;

	// Saved games gateway passed to each new scene
	readonly #savedDataGateway: SavedDataGateway;

	// Active scenes, top scene last
	readonly #sceneStack: Scene[] = [];

	/**
	 * Stores the container, the game data, the game rules, the strings and the saved games gateway
	 */
	constructor(params: SceneManagerParams)
	{
		this.#container        = params.container;
		this.#gameDataStore    = params.gameDataStore;
		this.#gameRulesStore   = params.gameRulesStore;
		this.#stringsStore     = params.stringsStore;
		this.#savedDataGateway = params.savedDataGateway;
	}

	/**
	 * Updates the top scene
	 */
	async update(deltaTime: number): Promise<void>
	{
		await this.#sceneStack.at(-1)?.update(deltaTime);
	}

	/**
	 * Renders the top scene
	 */
	async render(): Promise<void>
	{
		await this.#sceneStack.at(-1)?.render();
	}

	/**
	 * Adds a scene to the top of the stack
	 */
	async push(sceneConstructor: SceneConstructor): Promise<void>
	{
		await this.#sceneStack.at(-1)?.pause();
		await this.#doPush(sceneConstructor);
	}

	/**
	 * Removes the top scene from the stack
	 */
	async pop(): Promise<void>
	{
		await this.#doPop();
		await this.#sceneStack.at(-1)?.resume();
	}

	/**
	 * Replaces the top scene without resuming the one below
	 */
	async replace(sceneConstructor: SceneConstructor): Promise<void>
	{
		await this.#doPop();
		await this.#doPush(sceneConstructor);
	}

	/**
	 * Removes every scene from the stack
	 */
	async clear(): Promise<void>
	{
		while (0 < this.#sceneStack.length)
		{
			await this.#doPop();
		}
	}

	/**
	 * Creates a scene, adds it to the top of the stack and enters it
	 */
	async #doPush(sceneConstructor: SceneConstructor): Promise<void>
	{
		const scene = new sceneConstructor({
			gameDataStore: this.#gameDataStore,
			gameRulesStore: this.#gameRulesStore,
			stringsStore: this.#stringsStore,
			savedDataGateway: this.#savedDataGateway,
			pushScene: this.push.bind(this),
			popScene: this.pop.bind(this),
			clearScenes: this.clear.bind(this),
		});
		this.#sceneStack.push(scene);
		this.#container.append(scene);
		await scene.enter();
	}

	/**
	 * Removes the top scene and exits it without resuming the one below
	 */
	async #doPop(): Promise<void>
	{
		const scene = this.#sceneStack.pop();
		if (scene instanceof Scene)
		{
			scene.remove();
			await scene.exit();
		}
	}
}









/**
 * Options for creating a system
 */
interface SystemParams
{
	gameDataStore: GameDataStore;
}

/**
 * Base class for a system that changes the game data
 */
abstract class System
{
	// Game data the system reads and changes
	readonly #gameDataStore: GameDataStore;

	/**
	 * Stores the game data
	 */
	constructor(params: SystemParams)
	{
		this.#gameDataStore = params.gameDataStore;
	}

	/**
	 * Runs every 5 in-game seconds
	 */
	async everyFiveSeconds(): Promise<void>
	{
		// Do something
	}

	/**
	 * Runs every 10 in-game minutes
	 */
	async everyTenMinutes(): Promise<void>
	{
		// Do something
	}

	/**
	 * Runs every 30 in-game minutes
	 */
	async everyThirtyMinutes(): Promise<void>
	{
		// Do something
	}

	/**
	 * Runs every in-game hour
	 */
	async everyHour(): Promise<void>
	{
		// Do something
	}

	/**
	 * Runs every in-game day
	 */
	async everyDay(): Promise<void>
	{
		// Do something
	}

	/**
	 * Runs every in-game month
	 */
	async everyMonth(): Promise<void>
	{
		// Do something
	}

	/**
	 * Gives subclasses access to the game data
	 */
	protected get _data(): GameDataStore
	{
		return this.#gameDataStore;
	}
}

/**
 * Detects UFOs with base and craft radars
 */
class RadarDetectionSystem extends System
{ }

/**
 * Recovers wounded soldiers
 */
class SoldierRecoverySystem extends System
{ }

/**
 * Resolves psi training
 */
class PsiTrainingSystem extends System
{ }






/**
 * Holds the systems in run order
 */
class SystemManager
{
	// Systems in the order they run
	readonly #systems: System[] = [];

	/**
	 * Adds a system to the end of the run order
	 */
	add(system: System): void
	{
		this.#systems.push(system);
	}

	/**
	 * Runs every 5 in-game seconds
	 */
	async everyFiveSeconds(): Promise<void>
	{
		for (const system of this.#systems) await system.everyFiveSeconds();
	}

	/**
	 * Runs every 10 in-game minutes
	 */
	async everyTenMinutes(): Promise<void>
	{
		for (const system of this.#systems) await system.everyTenMinutes();
	}

	/**
	 * Runs every 30 in-game minutes
	 */
	async everyThirtyMinutes(): Promise<void>
	{
		for (const system of this.#systems) await system.everyThirtyMinutes();
	}

	/**
	 * Runs every in-game hour
	 */
	async everyHour(): Promise<void>
	{
		for (const system of this.#systems) await system.everyHour();
	}

	/**
	 * Runs every in-game day
	 */
	async everyDay(): Promise<void>
	{
		for (const system of this.#systems) await system.everyDay();
	}

	/**
	 * Runs every in-game month
	 */
	async everyMonth(): Promise<void>
	{
		for (const system of this.#systems) await system.everyMonth();
	}
}











// Register the scenes as custom elements
window.customElements.define('bootstrap-scene', BootstrapScene);
window.customElements.define('main-menu-scene', MainMenuScene);
window.customElements.define('new-game-scene', NewGameScene);
window.customElements.define('load-game-scene', LoadGameScene);
window.customElements.define('save-game-scene', SaveGameScene);
window.customElements.define('geoscape-scene', GeoscapeScene);
window.customElements.define('geoscape-options-scene', GeoscapeOptionsScene);









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
