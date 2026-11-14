import type { GameDataStore } from '../../GameDataStore.js';

/**
 * Options for creating a system
 */
export interface GeoscapeSystemParams
{
	gameDataStore: GameDataStore;
}

/**
 * Base class for a system that changes the game data
 */
export abstract class GeoscapeSystem
{
	// Game data the system reads and changes
	readonly #gameDataStore: GameDataStore;

	/**
	 * Stores the game data
	 */
	constructor(params: GeoscapeSystemParams)
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
