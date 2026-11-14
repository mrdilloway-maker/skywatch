import { GameSpeed } from '../stores/GameSpeed.js';
import { GeoscapeSystemManager } from '../systems/geoscape/GeoscapeSystemManager.js';
import { PsiTrainingSystem } from '../systems/geoscape/PsiTrainingSystem.js';
import { RadarDetectionSystem } from '../systems/geoscape/RadarDetectionSystem.js';
import { SoldierRecoverySystem } from '../systems/geoscape/SoldierRecoverySystem.js';
import { GeoscapeOptionsScene } from './GeoscapeOptionsScene.js';
import { Scene } from './Scene.js';

import type { SceneParams } from './Scene.js';

/**
 * Geoscape scene
 */
export class GeoscapeScene extends Scene
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
	readonly #systemManager: GeoscapeSystemManager = new GeoscapeSystemManager();

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

// Register the scene as a custom element
window.customElements.define('geoscape-scene', GeoscapeScene);
