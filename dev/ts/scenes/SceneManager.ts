import { Scene } from './Scene.js';

import type { GameDataStore } from '../stores/GameDataStore.js';
import type { GameRulesStore } from '../stores/GameRulesStore.js';
import type { SavedDataGateway } from '../stores/SavedDataGateway.js';
import type { StringsStore } from '../stores/StringsStore.js';
import type { SceneConstructor } from './Scene.js';

/**
 * Options for creating the scene manager
 */
export interface SceneManagerParams
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
export class SceneManager
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
