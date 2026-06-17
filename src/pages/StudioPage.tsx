import { useState } from "react";
import { Menu, Sliders, X } from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { LeftSidebar } from "../components/sidebar/LeftSidebar";
import { Canvas } from "../components/workspace/Canvas";
import { VersionTree } from "../components/version-tree/VersionTree";
import { CanvasToolbar } from "../components/toolbar/CanvasToolbar";
import { InspectorPanel } from "../components/inspector/InspectorPanel";
import { useCanvas } from "../hooks/useCanvas";
import { useZoom } from "../hooks/useZoom";
import { useVersionTree } from "../hooks/useVersionTree";

// Unsplash mock search images for style presets
const MOCK_IMAGES: Record<string, string> = {
	Modern:
		"https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80",
	Minimalist:
		"https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=400&q=80",
	Luxury:
		"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=400&q=80",
	Scandinavian:
		"https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=400&q=80",
	Industrial:
		"https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&w=400&q=80",
};

export function StudioPage() {
	const {
		pan,
		isDragging,
		isHandMode,
		setIsHandMode,
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
	} = useCanvas();

	const { zoom, zoomIn, zoomOut } = useZoom(100, 25, 200, 10);
	const { nodes, edges, selectedNodeId, selectNode, addVersion, removeNode } =
		useVersionTree();

	const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
	const [mobileRightOpen, setMobileRightOpen] = useState(false);

	// Active selected node details
	const activeNode = nodes.find((n) => n.id === selectedNodeId) || null;

	const handleGenerate = (
		prompt: string,
		preset: string,
		strength: number,
		mode: "restyle" | "furnish-empty",
	) => {
		// Determine the parent node ID
		let parentId = "v1";
		if (activeNode) {
			parentId =
				activeNode.type === "placeholder"
					? activeNode.parentId || "v1"
					: activeNode.id;
		}

		// Generate style-specific image or default
		const mockImage = MOCK_IMAGES[preset] || MOCK_IMAGES.Scandinavian;

		// Node counter for naming
		const nodeIndex = nodes.filter((n) => n.type !== "placeholder").length + 1;
		const nodeTitle = `V${nodeIndex}: ${preset} Luxe`;

		// Add node
		addVersion(nodeTitle, mockImage, parentId, prompt, preset, strength, mode);

		// Close mobile panel on generation
		setMobileRightOpen(false);
	};

	const handleNewBranch = () => {
		// Highlight placeholder or base generation
		selectNode("v-placeholder");
		setMobileLeftOpen(false);
		alert(
			"New branch workflow: select 'New Variation' and click 'Generate Design' in the inspector.",
		);
	};

	return (
		<div className="h-screen w-screen flex flex-col overflow-hidden bg-[#faf8f7]">
			{/* Top Navigation */}
			<Navbar />

			{/* Main Studio Workspace container */}
			<div className="flex-1 flex pt-14 h-full w-full overflow-hidden relative">
				{/* Responsive Drawer Toggle Buttons (only visible on mobile/tablet) */}
				<div className="absolute top-18 left-4 z-20 flex gap-2 md:hidden">
					<button
						onClick={() => setMobileLeftOpen(true)}
						className="p-2 bg-white/95 border border-[#efeded] text-on-surface rounded-lg shadow-sm backdrop-blur-sm pointer-events-auto"
						title="Open Projects"
					>
						<Menu size={18} />
					</button>
				</div>

				<div className="absolute top-18 right-4 z-20 flex gap-2 lg:hidden">
					<button
						onClick={() => setMobileRightOpen(true)}
						className="p-2 bg-white/95 border border-[#efeded] text-on-surface rounded-lg shadow-sm backdrop-blur-sm pointer-events-auto"
						title="Open Generation settings"
					>
						<Sliders size={18} />
					</button>
				</div>

				{/* LEFT SIDEBAR - Persistent on desktop, drawer on mobile */}
				<div
					className={`h-full z-30 md:static absolute top-0 left-0 transition-transform duration-300 md:translate-x-0 ${
						mobileLeftOpen ? "translate-x-0" : "-translate-x-full"
					}`}
				>
					{/* Backdrop for mobile left drawer */}
					{mobileLeftOpen && (
						<div
							className="md:hidden absolute inset-0 bg-black/20 w-screen h-screen z-[-1]"
							onClick={() => setMobileLeftOpen(false)}
						/>
					)}

					<div className="relative h-full flex">
						<LeftSidebar
							nodes={nodes}
							selectedNodeId={selectedNodeId}
							onSelectNode={selectNode}
							onNewBranch={handleNewBranch}
						/>
						{/* Drawer close button inside drawer for mobile */}
						{mobileLeftOpen && (
							<button
								onClick={() => setMobileLeftOpen(false)}
								className="md:hidden absolute top-15 -right-10 p-2.5 bg-white border border-[#efeded] rounded-r-lg shadow-sm cursor-pointer"
							>
								<X size={18} />
							</button>
						)}
					</div>
				</div>

				{/* CENTER INFINITE CANVAS WORKSPACE */}
				<div className="flex-1 h-full relative flex overflow-hidden">
					<Canvas
						pan={pan}
						zoom={zoom}
						isDragging={isDragging}
						isHandMode={isHandMode}
						onMouseDown={handleMouseDown}
						onMouseMove={handleMouseMove}
						onMouseUp={handleMouseUp}
					>
						{/* Version Nodes SVG Tree connections and cards overlays */}
						<VersionTree
							nodes={nodes}
							edges={edges}
							selectedNodeId={selectedNodeId}
							onSelectNode={selectNode}
							onDeleteNode={removeNode}
						/>
					</Canvas>

					{/* Floating Canvas Dock */}
					<CanvasToolbar
						zoom={zoom}
						onZoomIn={zoomIn}
						onZoomOut={zoomOut}
						isHandMode={isHandMode}
						onToggleHandMode={() => setIsHandMode(!isHandMode)}
					/>
				</div>

				{/* RIGHT INSPECTOR PANEL - Persistent on desktop, drawer on tablet/mobile */}
				<div
					className={`h-full z-30 md:static absolute top-0 right-0 transition-transform duration-300 md:translate-x-0 ${
						mobileRightOpen ? "translate-x-0" : "translate-x-full"
					}`}
				>
					<div className="relative h-full flex">
						{/* Drawer close button inside drawer for tablet */}
						{mobileRightOpen && (
							<button
								onClick={() => setMobileRightOpen(false)}
								className="md:hidden absolute top-15 -left-10 p-2.5 bg-white border border-[#efeded] rounded-l-lg shadow-sm"
							>
								<X size={18} />
							</button>
						)}
						<InspectorPanel
							activeNode={activeNode}
							onGenerate={handleGenerate}
						/>
					</div>
				</div>
				{/* Backdrop for mobile right drawer */}
				{mobileRightOpen && (
					<div
						className="md:hidden absolute inset-0 bg-black/20 w-screen h-screen z-20"
						onClick={() => setMobileRightOpen(false)}
					/>
				)}
			</div>
		</div>
	);
}
