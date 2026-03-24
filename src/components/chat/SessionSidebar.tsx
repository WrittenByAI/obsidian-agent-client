import * as React from "react";
import { setIcon } from "obsidian";
import type { SessionInfo } from "../../domain/models/session-info";
import { groupSessionsByVaultPath } from "../../shared/session-grouping";

interface SessionSidebarProps {
	sessions: SessionInfo[];
	loading: boolean;
	error: string | null;
	hasMore: boolean;
	currentCwd: string;
	currentVaultName: string;
	activeSessionId: string | null;
	canRestore: boolean;
	canFork: boolean;
	canList: boolean;
	isUsingLocalSessions: boolean;
	localSessionIds: Set<string>;
	onRestoreSession: (sessionId: string, cwd: string) => Promise<void>;
	onForkSession: (sessionId: string, cwd: string) => Promise<void>;
	onDeleteSession: (sessionId: string) => void;
	onLoadMore: () => void;
	onFetchSessions: (cwd?: string) => void;
}

function SidebarIconButton({
	iconName,
	label,
	className,
	onClick,
}: {
	iconName: string;
	label: string;
	className: string;
	onClick: () => void;
}) {
	const iconRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (iconRef.current) {
			setIcon(iconRef.current, iconName);
		}
	}, [iconName]);

	return (
		<div
			ref={iconRef}
			className={className}
			aria-label={label}
			onClick={onClick}
		/>
	);
}

function formatRelativeTime(date: Date): string {
	const now = Date.now();
	const diffMs = now - date.getTime();
	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMinutes < 1) return "just now";
	if (diffMinutes < 60) {
		return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
	}
	if (diffHours < 24) {
		return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
	}
	if (diffDays === 1) return "yesterday";
	if (diffDays < 7) return `${diffDays} days ago`;

	const month = date.toLocaleString("default", { month: "short" });
	return `${month} ${date.getDate()}, ${date.getFullYear()}`;
}

function truncateTitle(title: string): string {
	return title.length > 50 ? `${title.slice(0, 50)}...` : title;
}

function SessionSidebarItem({
	session,
	isActive,
	canRestore,
	canFork,
	currentCwd,
	onRestoreSession,
	onForkSession,
	onDeleteSession,
}: {
	session: SessionInfo;
	isActive: boolean;
	canRestore: boolean;
	canFork: boolean;
	currentCwd: string;
	onRestoreSession: (sessionId: string, cwd: string) => Promise<void>;
	onForkSession: (sessionId: string, cwd: string) => Promise<void>;
	onDeleteSession: (sessionId: string) => void;
}) {
	return (
		<div
			className={`agent-client-session-sidebar-item${isActive ? " is-active" : ""}`}
		>
			<div className="agent-client-session-sidebar-item-content">
				<div className="agent-client-session-sidebar-item-title">
					{truncateTitle(session.title ?? "Untitled Session")}
				</div>
				<div className="agent-client-session-sidebar-item-metadata">
					{session.updatedAt && (
						<span>
							{formatRelativeTime(new Date(session.updatedAt))}
						</span>
					)}
					{session.cwd !== currentCwd && (
						<span
							title={session.cwd}
							className="agent-client-session-sidebar-item-cwd"
						>
							{session.cwd}
						</span>
					)}
				</div>
			</div>
			<div className="agent-client-session-sidebar-item-actions">
				{canRestore && (
					<SidebarIconButton
						iconName="play"
						label="Restore session"
						className="agent-client-session-sidebar-action-icon"
						onClick={() =>
							void onRestoreSession(session.sessionId, session.cwd)
						}
					/>
				)}
				{canFork && (
					<SidebarIconButton
						iconName="git-branch"
						label="Fork session"
						className="agent-client-session-sidebar-action-icon"
						onClick={() =>
							void onForkSession(session.sessionId, session.cwd)
						}
					/>
				)}
				<SidebarIconButton
					iconName="trash-2"
					label="Delete session"
					className="agent-client-session-sidebar-action-icon agent-client-session-sidebar-delete-icon"
					onClick={() => onDeleteSession(session.sessionId)}
				/>
			</div>
		</div>
	);
}

export function SessionSidebar({
	sessions,
	loading,
	error,
	hasMore,
	currentCwd,
	currentVaultName,
	activeSessionId,
	canRestore,
	canFork,
	canList,
	isUsingLocalSessions,
	localSessionIds,
	onRestoreSession,
	onForkSession,
	onDeleteSession,
	onLoadMore,
	onFetchSessions,
}: SessionSidebarProps) {
	const [showCurrentVaultOnly, setShowCurrentVaultOnly] = React.useState(false);
	const [hideNonLocalSessions, setHideNonLocalSessions] = React.useState(false);
	const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(
		new Set(),
	);

	const filteredSessions = React.useMemo(() => {
		let next = sessions;
		if (showCurrentVaultOnly) {
			next = next.filter((s) => s.cwd === currentCwd);
		}
		if (!isUsingLocalSessions && hideNonLocalSessions) {
			next = next.filter((s) => localSessionIds.has(s.sessionId));
		}
		return next;
	}, [
		sessions,
		showCurrentVaultOnly,
		currentCwd,
		isUsingLocalSessions,
		hideNonLocalSessions,
		localSessionIds,
	]);

	const grouped = React.useMemo(
		() =>
			groupSessionsByVaultPath(
				filteredSessions,
				currentCwd,
				currentVaultName,
			),
		[filteredSessions, currentCwd, currentVaultName],
	);

	const toggleGroup = React.useCallback((key: string) => {
		setCollapsedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	}, []);

	const handleRefresh = React.useCallback(() => {
		onFetchSessions(showCurrentVaultOnly ? currentCwd : undefined);
	}, [onFetchSessions, showCurrentVaultOnly, currentCwd]);

	React.useEffect(() => {
		handleRefresh();
	}, [handleRefresh]);

	return (
		<div className="agent-client-session-sidebar">
			<div className="agent-client-session-sidebar-header">
				<h4>Sessions</h4>
				<div className="agent-client-session-sidebar-header-actions">
					<button onClick={handleRefresh} disabled={loading}>
						{loading ? "Loading..." : "Refresh"}
					</button>
				</div>
			</div>

			<div className="agent-client-session-sidebar-filters">
				<label>
					<input
						type="checkbox"
						checked={showCurrentVaultOnly}
						onChange={(e) =>
							setShowCurrentVaultOnly(e.target.checked)
						}
					/>
					<span>Current vault only</span>
				</label>
				{canList && !isUsingLocalSessions && (
					<label>
						<input
							type="checkbox"
							checked={hideNonLocalSessions}
							onChange={(e) =>
								setHideNonLocalSessions(e.target.checked)
							}
						/>
						<span>Only local metadata</span>
					</label>
				)}
			</div>

			{error && (
				<div className="agent-client-session-sidebar-error">{error}</div>
			)}

			{!error && grouped.length === 0 && !loading && (
				<div className="agent-client-session-sidebar-empty">
					No sessions found
				</div>
			)}

			<div className="agent-client-session-sidebar-groups">
				{grouped.map((group) => {
					const isCollapsed = collapsedGroups.has(group.key);
					return (
						<div
							key={group.key}
							className="agent-client-session-sidebar-group"
						>
							<button
								className="agent-client-session-sidebar-group-header"
								onClick={() => toggleGroup(group.key)}
								title={group.cwd}
							>
								<span>{isCollapsed ? ">" : "v"}</span>
								<span>{group.label}</span>
								<span>
									{group.sessions.length}
								</span>
							</button>
							{!isCollapsed && (
								<div className="agent-client-session-sidebar-group-list">
									{group.sessions.map((session) => (
										<SessionSidebarItem
											key={session.sessionId}
											session={session}
											isActive={
												session.sessionId ===
												activeSessionId
											}
											canRestore={canRestore}
											canFork={canFork}
											currentCwd={currentCwd}
											onRestoreSession={onRestoreSession}
											onForkSession={onForkSession}
											onDeleteSession={onDeleteSession}
										/>
									))}
								</div>
							)}
						</div>
					);
				})}
			</div>

			{!error && hasMore && (
				<div className="agent-client-session-sidebar-load-more">
					<button disabled={loading} onClick={onLoadMore}>
						{loading ? "Loading..." : "Load more"}
					</button>
				</div>
			)}
		</div>
	);
}
