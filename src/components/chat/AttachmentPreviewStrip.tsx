import * as React from "react";
const { useRef, useLayoutEffect } = React;
import { setIcon } from "obsidian";
import type { AttachedFile } from "../../domain/models/chat-input-state";

interface AttachmentPreviewStripProps {
	files: AttachedFile[];
	onRemove: (id: string) => void;
}

/**
 * Horizontal strip of attachment previews with remove buttons.
 * - Images: show thumbnail
 * - Files: show file icon with filename
 */
function AttachmentPreviewItem({
	file,
	onRemove,
}: {
	file: AttachedFile;
	onRemove: (id: string) => void;
}) {
	const fileIconRef = useRef<HTMLSpanElement>(null);
	const removeBtnRef = useRef<HTMLButtonElement>(null);

	useLayoutEffect(() => {
		const el = fileIconRef.current;
		if (el && !(file.kind === "image" && file.data)) {
			setIcon(el, "file");
		}
	}, [file.kind, file.data]);

	useLayoutEffect(() => {
		const el = removeBtnRef.current;
		if (el) {
			setIcon(el, "x");
		}
	}, []);

	return (
		<div className="agent-client-attachment-preview-item">
			{file.kind === "image" && file.data ? (
				<img
					src={`data:${file.mimeType};base64,${file.data}`}
					alt="Attached image"
					className="agent-client-attachment-preview-thumbnail"
				/>
			) : (
				<div className="agent-client-attachment-preview-file">
					<span
						ref={fileIconRef}
						className="agent-client-attachment-preview-file-icon"
					/>
					<span className="agent-client-attachment-preview-file-name">
						{file.name ?? "file"}
					</span>
				</div>
			)}
			<button
				ref={removeBtnRef}
				type="button"
				className="agent-client-attachment-preview-remove"
				title="Remove attachment"
				onMouseDown={(e) => {
					e.stopPropagation();
				}}
				onClick={(e) => {
					e.stopPropagation();
					onRemove(file.id);
				}}
			/>
		</div>
	);
}

export function AttachmentPreviewStrip({
	files,
	onRemove,
}: AttachmentPreviewStripProps) {
	if (files.length === 0) return null;

	return (
		<div className="agent-client-attachment-preview-strip">
			{files.map((file) => (
				<AttachmentPreviewItem
					key={file.id}
					file={file}
					onRemove={onRemove}
				/>
			))}
		</div>
	);
}
