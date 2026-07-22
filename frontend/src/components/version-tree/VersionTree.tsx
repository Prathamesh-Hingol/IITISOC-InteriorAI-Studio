import { Box, Download, Eye, Trash2, ImagePlus, Loader2, AlertCircle } from "lucide-react";
import type { VersionNode, VersionEdge } from "../../types";

interface VersionTreeProps {
	nodes: VersionNode[];
	edges: VersionEdge[];
	selectedNodeId: string | null;
	onSelectNode: (id: string) => void;
	onDeleteNode?: (id: string) => void;
	onPreviewNode?: (node: VersionNode) => void;
	onView3D?: (node: VersionNode) => void;
}

export function VersionTree({
	nodes,
	edges,
	selectedNodeId,
	onSelectNode,
	onPreviewNode,
	onDeleteNode,
	onView3D,
}: VersionTreeProps) {
	const cardWidth = 200;
	const cardHeight = 140;

	const handleDownload = async (imageUrl: string, title: string) => {
		try {
			const response = await fetch(imageUrl);
			if (!response.ok) {
				throw new Error("Unable to download image");
			}

			const imageBlob = await response.blob();
			const downloadUrl = URL.createObjectURL(imageBlob);
			const link = document.createElement("a");
			link.href = downloadUrl;
			link.download = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "generation"}.jpg`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(downloadUrl);
		} catch {
			window.open(imageUrl, "_blank", "noopener,noreferrer");
		}
	};

	const rootNode = nodes.find((n) => !n.parentId);
	const rootX = rootNode?.x ?? 400;
	const rootY = rootNode?.y ?? 350;

	return (
		<div className="absolute inset-0 pointer-events-none">
			{/* SVG Connections Layer */}
			<svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
				{/* Definitions for arrow markers or filters if needed */}
				<defs>
					<linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stopColor="#00362d" />
						<stop offset="100%" stopColor="#00362d" />
					</linearGradient>
				</defs>

				{/* Historical dotted line stretching from left to root node */}
				<line
					x1={rootX - 200}
					y1={rootY + cardHeight / 2}
					x2={rootX}
					y2={rootY + cardHeight / 2}
					stroke="#c0c8c5"
					strokeWidth="1.5"
					strokeDasharray="4,4"
				/>

				{/* Render dynamic connections between tree nodes */}
				{edges.map((edge) => {
					const sourceNode = nodes.find((n) => n.id === edge.source);
					const targetNode = nodes.find((n) => n.id === edge.target);

					if (!sourceNode || !targetNode) return null;

					const sX = (sourceNode.x || 0) + cardWidth;
					const sY = (sourceNode.y || 0) + cardHeight / 2;
					const tX = targetNode.x || 0;
					const tY = (targetNode.y || 0) + cardHeight / 2;

					const dx = Math.abs(tX - sX) / 2;
					const cpX1 = sX + dx;
					const cpY1 = sY;
					const cpX2 = tX - dx;
					const cpY2 = tY;

					const isActiveConnection = selectedNodeId === targetNode.id;

					return (
						<path
							key={edge.id}
							d={`M ${sX} ${sY} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${tX} ${tY}`}
							fill="none"
							stroke={isActiveConnection ? "#00362d" : "#c0c8c5"}
							strokeWidth={isActiveConnection ? "2" : "1.5"}
							className="transition-colors duration-200"
						/>
					);
				})}
			</svg>

			{/* HTML Cards Layer */}
			<div className="absolute inset-0 pointer-events-auto">
				{nodes.map((node) => {
					const isSelected = selectedNodeId === node.id;
					const left = node.x || 0;
					const top = node.y || 0;

					// Placeholder Node
					if (node.type === "placeholder") {
						return (
							<div
								key={node.id}
								onClick={() => onSelectNode(node.id)}
								style={{
									left,
									top,
									width: cardWidth,
									height: cardHeight,
								}}
								className="absolute bg-[#efeded]/30 hover:bg-[#efeded]/50 border-2 border-dashed border-[#c0c8c5] hover:border-on-surface-variant rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer select-none transition-all duration-200"
							>
								<div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#efeded] text-[#707976] shadow-sm mb-2">
									<ImagePlus size={18} />
								</div>
								<span className="text-xs font-semibold text-on-surface">
									{node.title}
								</span>
								<span className="text-[10px] text-on-surface-variant mt-0.5">
									{node.createdAt}
								</span>
							</div>
						);
					}

					// Active/Original/Generated version node card
					return (
						<div
							key={node.id}
							onClick={() => onSelectNode(node.id)}
							style={{
								left,
								top,
								width: cardWidth,
								height: cardHeight,
							}}
							className={`absolute bg-white rounded-xl shadow-sm cursor-pointer select-none transition-all duration-300 p-2 border flex flex-col justify-between group ${
								isSelected
									? "border-[#00362d] ring-2 ring-[#00362d]/10"
									: "border-[#efeded] hover:border-[#c0c8c5] hover:shadow"
							}`}
						>
							{/* Image Preview Area */}
							<div className="relative aspect-video w-full rounded-lg overflow-hidden bg-[#efeded] border border-[#efeded]/80">
								{node.status === "queued" || node.status === "processing" ? (
									// ── Loading Shimmer Skeleton ──
									<div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#f0eeec] via-[#e8e5e2] to-[#f0eeec] animate-pulse">
										{/* Shimmer sweep */}
										<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.5s_infinite] -translate-x-full" style={{ animation: "shimmer 1.5s infinite" }} />
										<Loader2 size={16} className="text-primary/60 animate-spin mb-1" />
										<span className="text-[9px] font-semibold text-primary/50 uppercase tracking-wider">
											{node.status === "processing" ? "Generating…" : "Queued"}
										</span>
									</div>
								) : node.status === "failed" ? (
									// ── Failed State ──
									<div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50">
										<AlertCircle size={16} className="text-red-400 mb-1" />
										<span className="text-[9px] font-semibold text-red-400 uppercase tracking-wider">Failed</span>
									</div>
								) : node.image ? (
									<img
										src={node.image}
										alt={node.title}
										className="w-full h-full object-cover"
									/>
								) : (
									<div className="w-full h-full bg-[#efeded]" />
								)}

								{/* Hover overlay — only show when image is ready */}
								{node.status === "completed" && (
									<div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-all duration-200">
										<button
											onClick={(e) => {
												e.stopPropagation();
												if (onPreviewNode) {
													onPreviewNode(node);
												}
											}}
											className="p-2 cursor-pointer bg-white/95 hover:bg-white text-on-surface hover:text-primary rounded-full transition-all shadow-sm hover:scale-110"
											title="Preview"
										>
											<Eye size={13} />
										</button>
										<button
											onClick={(e) => {
												e.stopPropagation();
												onView3D?.(node);
											}}
											className="p-2 cursor-pointer bg-white/95 hover:bg-white text-on-surface hover:text-primary rounded-full transition-all shadow-sm hover:scale-110"
											title="View in 3D"
										>
											<Box size={13} />
										</button>

										<button
											onClick={(e) => {
												e.stopPropagation();
												if (node.image) {
													void handleDownload(node.image, node.title);
												}
											}}
											disabled={!node.image}
											className="p-2 cursor-pointer bg-white/95 hover:bg-white text-on-surface hover:text-primary rounded-full transition-all shadow-sm hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
											title="Download image"
										>
											<Download size={13} />
										</button>
										<button
											onClick={(e) => {
												e.stopPropagation();
												if (onDeleteNode) {
													onDeleteNode(node.id);
												}
											}}
											className="p-2 cursor-pointer bg-white/95 hover:bg-red-50 text-red-500 rounded-full transition-all shadow-sm hover:scale-110"
											title="Delete"
										>
											<Trash2 size={13} />
										</button>
									</div>
								)}
								{/* Always show delete button for failed nodes */}
								{node.status === "failed" && (
									<div className="absolute inset-0 flex items-end justify-end p-1.5">
										<button
											onClick={(e) => {
												e.stopPropagation();
												if (onDeleteNode) onDeleteNode(node.id);
											}}
											className="p-1.5 cursor-pointer bg-white/95 hover:bg-red-50 text-red-500 rounded-full transition-all shadow-sm hover:scale-110"
											title="Remove"
										>
											<Trash2 size={11} />
										</button>
									</div>
								)}
							</div>

							{/* Node Metadata (Bottom part of card) */}
							<div className="px-1 pt-1.5 flex flex-col">
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-bold text-on-surface truncate pr-1">
										{node.title}
									</span>
									{isSelected && (
										<span className="w-1.5 h-1.5 rounded-full bg-primary" />
									)}
								</div>
								<span className="text-[9px] text-[#707976] mt-0.5 truncate">
									{node.createdAt}
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
