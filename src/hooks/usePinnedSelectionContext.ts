import { useCallback, useState } from "react";
import type { NoteMetadata } from "../domain/ports/vault-access.port";
import type { IVaultAccess } from "../domain/ports/vault-access.port";
import type { PinnedSelectionContext } from "../domain/models/pinned-selection-context";

const DEFAULT_MAX_SELECTION_LENGTH = 10000;
const DEFAULT_MAX_NOTE_LENGTH = 10000;

export interface UsePinnedSelectionContextReturn {
	pinnedItems: PinnedSelectionContext[];
	addPinnedFromActiveNote: (activeNote: NoteMetadata | null) => Promise<void>;
	removePinned: (id: string) => void;
	clearPinned: () => void;
}

export function usePinnedSelectionContext(
	vaultAccess: IVaultAccess,
	maxSelectionLength = DEFAULT_MAX_SELECTION_LENGTH,
	maxNoteLength = DEFAULT_MAX_NOTE_LENGTH,
): UsePinnedSelectionContextReturn {
	const [pinnedItems, setPinnedItems] = useState<PinnedSelectionContext[]>([]);

	const addPinnedFromActiveNote = useCallback(
		async (activeNote: NoteMetadata | null) => {
			if (!activeNote) {
				return;
			}

			const content = await vaultAccess.readNote(activeNote.path);
			const lines = content.split("\n");

			const fromLine = activeNote.selection
				? activeNote.selection.from.line + 1
				: 1;
			const toLine = activeNote.selection
				? activeNote.selection.to.line + 1
				: lines.length;

			const dedupeKey = activeNote.selection
				? `${activeNote.path}:${fromLine}-${toLine}`
				: `${activeNote.path}:full-note`;

			let selectedText: string;
			if (activeNote.selection) {
				const selectedLines = lines.slice(
					activeNote.selection.from.line,
					activeNote.selection.to.line + 1,
				);
				selectedText = selectedLines.join("\n");

				if (selectedText.length > maxSelectionLength) {
					selectedText =
						selectedText.substring(0, maxSelectionLength) +
						`\n\n[Note: Truncated from ${selectedLines.join("\n").length} to ${maxSelectionLength} characters]`;
				}
			} else {
				selectedText = content;
				if (selectedText.length > maxNoteLength) {
					selectedText =
						selectedText.substring(0, maxNoteLength) +
						`\n\n[Note: Truncated from ${content.length} to ${maxNoteLength} characters]`;
				}
			}

			setPinnedItems((prev) => {
				const alreadyExists = prev.some(
					(item) =>
						`${item.notePath}:${item.fromLine}-${item.toLine}` ===
						dedupeKey,
				);
				if (alreadyExists) {
					return prev;
				}

				return [
					...prev,
					{
						id: crypto.randomUUID(),
						notePath: activeNote.path,
						noteName: activeNote.name,
						fromLine,
						toLine,
						text: selectedText,
						createdAt: new Date().toISOString(),
					},
				];
			});
		},
		[maxSelectionLength, maxNoteLength, vaultAccess],
	);

	const removePinned = useCallback((id: string) => {
		setPinnedItems((prev) => prev.filter((item) => item.id !== id));
	}, []);

	const clearPinned = useCallback(() => {
		setPinnedItems([]);
	}, []);

	return {
		pinnedItems,
		addPinnedFromActiveNote,
		removePinned,
		clearPinned,
	};
}

