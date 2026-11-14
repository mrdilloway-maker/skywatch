import type { GameData } from '../model/GameDataStore.js';

/**
 * Number of a save slot
 */
export type SaveSlotIndex = 1 | 2 | 3;

/**
 * A saved game as stored in a save slot
 */
export interface SavedData
{
	name: string;
	savedAt: number;
	gameData: GameData;
}

/**
 * Reads and writes saved games in localStorage
 */
export class SavedDataGateway
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
