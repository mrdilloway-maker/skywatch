/**
 * In-game milliseconds that pass per real second at each game speed
 */
export enum GameSpeed
{
	PAUSED      = 0,
	FIVE_SECS   = 5_000,
	ONE_MIN     = 60_000,
	FIVE_MINS   = 300_000,
	THIRTY_MINS = 1_800_000,
	ONE_HOUR    = 3_600_000,
	ONE_DAY     = 86_400_000,
}
