/**
 * Holds the translated text strings, keyed by string ID
 */
export class StringsStore
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
