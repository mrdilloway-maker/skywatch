import type { GeoscapeSystem } from './GeoscapeSystem.js';

/**
 * Holds the systems in run order
 */
export class GeoscapeSystemManager
{
	// Systems in the order they run
	readonly #systems: GeoscapeSystem[] = [];

	/**
	 * Adds a system to the end of the run order
	 */
	add(system: GeoscapeSystem): void
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
