/**
 * A facility in the facilities ruleset
 */
export interface FacilityRulesetEntry
{
	id: string;
	cost: number;
}

/**
 * A topic in the research ruleset
 */
export interface ResearchRulesetEntry
{
	id: string;
	cost: number;
	points: number;
}

/**
 * An item in the items ruleset
 */
export interface ItemRulesetEntry
{
	id: string;
	costBuy: number;
	costSell: number;
}

/**
 * Holds the static rules data loaded at boot
 */
export class GameRulesStore
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
