import { GameSpeed } from './GameSpeed.js';

/**
 * Plain game data, as loaded from a new game or a save
 */
export interface GameData
{
	funds: number;
	date: number;
	difficulty: number;
}

/**
 * Holds the state of the current game
 */
export class GameDataStore
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
	 * Returns the game data as plain data for saving
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
