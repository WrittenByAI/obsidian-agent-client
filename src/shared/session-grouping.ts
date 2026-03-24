import type { SessionInfo } from "../domain/models/session-info";
import { convertWindowsPathToWsl } from "./wsl-utils";

export interface SessionVaultGroup {
	key: string;
	cwd: string;
	label: string;
	isCurrentVault: boolean;
	sessions: SessionInfo[];
}

function stripTrailingSlashes(path: string): string {
	return path.replace(/[\\/]+$/, "");
}

function normalizeSeparators(path: string): string {
	return path.replace(/\\/g, "/");
}

function normalizeDrivePrefix(path: string): string {
	return path.replace(/^([A-Z]):/, (_, drive: string) => {
		return `${drive.toLowerCase()}:`;
	});
}

export function normalizeCwdKey(cwd: string): string {
	const raw = cwd.trim();
	if (!raw) {
		return "";
	}

	// Normalize all Windows-like paths to WSL-like key when possible.
	const wslLike = convertWindowsPathToWsl(raw);
	const normalized = normalizeSeparators(stripTrailingSlashes(wslLike));
	return normalizeDrivePrefix(normalized).toLowerCase();
}

function getLastPathSegment(path: string): string {
	const normalized = normalizeSeparators(stripTrailingSlashes(path));
	if (!normalized) {
		return "Unknown vault";
	}
	const parts = normalized.split("/");
	return parts[parts.length - 1] || "Unknown vault";
}

function sortSessionsNewestFirst(a: SessionInfo, b: SessionInfo): number {
	const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
	const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
	return bTime - aTime;
}

function sortGroups(
	a: SessionVaultGroup,
	b: SessionVaultGroup,
	currentKey: string,
): number {
	if (a.key === currentKey && b.key !== currentKey) {
		return -1;
	}
	if (b.key === currentKey && a.key !== currentKey) {
		return 1;
	}

	const aLastUpdate = a.sessions[0]?.updatedAt
		? new Date(a.sessions[0].updatedAt!).getTime()
		: 0;
	const bLastUpdate = b.sessions[0]?.updatedAt
		? new Date(b.sessions[0].updatedAt!).getTime()
		: 0;

	if (aLastUpdate !== bLastUpdate) {
		return bLastUpdate - aLastUpdate;
	}

	return a.label.localeCompare(b.label);
}

export function groupSessionsByVaultPath(
	sessions: SessionInfo[],
	currentVaultPath: string,
	currentVaultName: string,
): SessionVaultGroup[] {
	const currentKey = normalizeCwdKey(currentVaultPath);
	const groupMap = new Map<string, SessionVaultGroup>();

	for (const session of sessions) {
		const key = normalizeCwdKey(session.cwd);
		const isCurrent = key === currentKey;
		const baseCwd = session.cwd || currentVaultPath;

		if (!groupMap.has(key)) {
			groupMap.set(key, {
				key,
				cwd: baseCwd,
				label: isCurrent
					? currentVaultName
					: getLastPathSegment(baseCwd),
				isCurrentVault: isCurrent,
				sessions: [],
			});
		}

		groupMap.get(key)!.sessions.push(session);
	}

	const groups = Array.from(groupMap.values());
	for (const group of groups) {
		group.sessions.sort(sortSessionsNewestFirst);
	}

	groups.sort((a, b) => sortGroups(a, b, currentKey));
	return groups;
}
