import { Edit2, Eye, MoreHorizontal, ImagePlus } from "lucide-react";
import type { VersionNode, VersionEdge } from "../../types";

interface VersionTreeProps {
	nodes: VersionNode[];
	edges: VersionEdge[];
	selectedNodeId: string | null;
	onSelectNode: (id: string) => void;
	onDeleteNode?: (id: string) => void;
	onPreviewNode?: (node: VersionNode) => void;
}

export function VersionTree({
	nodes,
	edges,
	selectedNodeId,
	onSelectNode,
	onPreviewNode,
}: VersionTreeProps) {
	const cardWidth = 200;
	const cardHeight = 135;

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

				{/* 1. Historical dotted line stretching from the left to V1 */}
				<line
					x1={200}
					y1={415} // Center left of V1 (V1 is at x: 400, y: 350)
					x2={400}
					y2={415}
					stroke="#c0c8c5"
					strokeWidth="1.5"
					strokeDasharray="4,4"
				/>

				{/* 2. Custom Junction Split Connections for V1, V2, and Placeholder */}
				{/* Main horizontal output from V1 (right-edge is 600, right-center Y is 417) */}
				{/* <line
          x1={600}
          y1={417}
          x2={640}
          y2={417}
          stroke="#00362d"
          strokeWidth="2"
        /> */}

				{/* Diagonal up to V2 (left-edge is 750, left-center Y is 297) */}
				{/* <line
          x1={640}
          y1={417}
          x2={750}
          y2={297}
          stroke="#00362d"
          strokeWidth="2"
        /> */}

				{/* Diagonal down to Placeholder (left-edge is 750, left-center Y is 537) */}
				{/* <line
          x1={640}
          y1={417}
          x2={750}
          y2={537}
          stroke="#c0c8c5"
          strokeWidth="2"
        /> */}

				{/* 3. Render connections for any dynamically added nodes */}
				{edges.map((edge) => {
					// Skip the static connections that are custom drawn above
					if (
						(edge.source === "v1" && edge.target === "v2") ||
						(edge.source === "v1" && edge.target === "v-placeholder")
					) {
						return null;
					}

					const sourceNode = nodes.find((n) => n.id === edge.source);
					const targetNode = nodes.find((n) => n.id === edge.target);

					if (!sourceNode || !targetNode) return null;

					const sX = (sourceNode.x || 0) + cardWidth;
					const sY = (sourceNode.y || 0) + cardHeight / 2;
					const tX = targetNode.x || 0;
					const tY = (targetNode.y || 0) + cardHeight / 2;

					const cpX1 = sX + 100;
					const cpY1 = sY;
					const cpX2 = tX - 100;
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
								{node.image ? (
									<img
										src={node.image}
										alt={node.title}
										className="w-full h-full object-cover"
									/>
								) : (
									<div className="w-full h-full bg-[#efeded]" />
								)}

								{/* Hover overlay with action buttons */}
								<div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all duration-200">
									<button
										onClick={(e) => {
											e.stopPropagation();
											alert("Edit image details");
										}}
										className="p-1.5 cursor-pointer bg-white/95 hover:bg-white text-on-surface hover:text-primary rounded-full transition-colors shadow-sm"
										title="Edit"
									>
										<Edit2 size={12} />
									</button>
									<button
										onClick={(e) => {
											e.stopPropagation();
											if (onPreviewNode) {
												onPreviewNode(node);
											}
										}}
										className="p-1.5 cursor-pointer bg-white/95 hover:bg-white text-on-surface hover:text-primary rounded-full transition-colors shadow-sm"
										title="Preview"
									>
										<Eye size={12} />
									</button>
									<button
										onClick={(e) => {
											e.stopPropagation();

											alert("More options");
										}}
										className="p-1.5 cursor-pointer bg-white/95 hover:bg-white text-on-surface hover:text-primary rounded-full transition-colors shadow-sm"
										title="Options"
									>
										<MoreHorizontal size={12} />
									</button>
								</div>
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
