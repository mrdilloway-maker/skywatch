import { Scene } from '../Scene.js';
import { MainMenuScene } from './MainMenuScene.js';

import type { SceneParams } from '../Scene.js';

/**
 * First scene, which loads the strings and rulesets and hands over to the main menu
 */
export class BootstrapScene extends Scene
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

// Register the scene as a custom element
window.customElements.define('bootstrap-scene', BootstrapScene);
