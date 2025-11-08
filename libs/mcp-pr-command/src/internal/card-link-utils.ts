import { context } from './context';

const MONTH_TOTAL = 12;
const YEAR_TOTAL = 31;
function isValidISODateString(branch?: string | null): boolean {
	const s = branch?.match(/\w+\/(\d{4}-\d{2}-\d{2})(?:-?.+)?/);
	const m = s?.[1]?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return false;
	const [, yearStr, monthStr, dayStr] = m as string[];
	if (!yearStr || !monthStr || !dayStr) return false;
	const year = parseInt(yearStr, 10);
	const month = parseInt(monthStr, 10);
	const day = parseInt(dayStr, 10);
	if (month < 1 || month > MONTH_TOTAL) return false;
	if (day < 1 || day > YEAR_TOTAL) return false;
	const dt = new Date(Date.UTC(year, month - 1, day));
	return (
		dt.getUTCFullYear() === year &&
		dt.getUTCMonth() + 1 === month &&
		dt.getUTCDate() === day
	);
}

export function inferCardLinkFromBranch(
	branch?: string | null,
): string | undefined {
	if (
		!branch ||
		!context.cardLinkInferPattern ||
		!context.prLinkInferPattern ||
		typeof branch !== 'string'
	) {
		return undefined;
	}
	if (isValidISODateString(branch)) return undefined;
	// Convert branch using patterns
	const link = branch.replace(
		context.cardLinkInferPattern,
		context.prLinkInferPattern,
	);
	if (!link || link === branch) return undefined;
	return link;
}
