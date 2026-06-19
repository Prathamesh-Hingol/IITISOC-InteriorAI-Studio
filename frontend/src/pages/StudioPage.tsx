import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, Sliders, X, Upload, ImagePlus, Loader2, AlertCircle } from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { LeftSidebar } from "../components/sidebar/LeftSidebar";
import { Canvas } from "../components/workspace/Canvas";
import { VersionTree } from "../components/version-tree/VersionTree";
import { CanvasToolbar } from "../components/toolbar/CanvasToolbar";
import { InspectorPanel } from "../components/inspector/InspectorPanel";
import { useCanvas } from "../hooks/useCanvas";
import { useZoom } from "../hooks/useZoom";
import { useGetProjectDetail } from "../hooks/useProject";
import { useGetProjectTree } from "../hooks/useProjectTree";
import { useCreateGeneration, useDeleteGeneration } from "../hooks/useGeneration";
import { useUploadImage } from "../hooks/useUpload";
import type { VersionNode } from "../types";

export function StudioPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const navigate = useNavigate();

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

	// Page selection state
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

	// Fetch dynamic backend project context
	const { data: project, isLoading: isProjectLoading } = useGetProjectDetail(projectId);
	const {
		data: tree = { nodes: [], edges: [] },
		isLoading: isTreeLoading,
		error: treeError,
	} = useGetProjectTree(projectId, selectedNodeId);

	// Mutations
	const uploadImageMutation = useUploadImage();
	const createGenerationMutation = useCreateGeneration(projectId!);
	const deleteGenerationMutation = useDeleteGeneration(projectId!);

	const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
	const [mobileRightOpen, setMobileRightOpen] = useState(false);

	// Node variables
	const nodes = tree.nodes || [];
	const edges = tree.edges || [];

	// Automatically select the active or base node when tree is first loaded
	useEffect(() => {
		if (nodes.length > 0 && !selectedNodeId) {
			const activeNode = nodes.find((n:VersionNode) => n.type === "active") || nodes.find((n:VersionNode) => n.type === "original") || nodes[0];
			if (activeNode) {
				setSelectedNodeId(activeNode.id);
			}
		}
	}, [nodes, selectedNodeId]);

	// Find details of the selected node
	const activeNode = nodes.find((n:VersionNode) => n.id === selectedNodeId) || null;

	const handleGenerate = (
		prompt: string,
		preset: string,
		strength: number,
		mode: "restyle" | "furnish-empty"
	) => {
		if (!activeNode) return;

		// Determine the parent ID (if selected node is placeholder, branch from parent, else branch from selected itself)
		const parentId = activeNode.type === "placeholder" ? activeNode.parentId : activeNode.id;

		createGenerationMutation.mutate(
			{
				parentId,
				prompt,
				preset,
				creativityStrength: strength,
				generationMode: mode,
			},
			{
				onSuccess: (newGen) => {
					// Select the new node
					setSelectedNodeId(newGen.id);
					setMobileRightOpen(false);
				},
			}
		);
	};

	const handleDeleteNode = (id: string) => {
		if (id === "v-placeholder") return;
		
		deleteGenerationMutation.mutate(id, {
			onSuccess: () => {
				// Reset selection to root node
				const rootNode = nodes.find((n:VersionNode) => !n.parentId);
				if (rootNode && rootNode.id !== id) {
					setSelectedNodeId(rootNode.id);
				} else {
					setSelectedNodeId(null);
				}
			},
		});
	};

	const handleBaseImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		uploadImageMutation.mutate(file, {
			onSuccess: (uploadRes) => {
				createGenerationMutation.mutate(
					{
						imageUrl: uploadRes.imageUrl,
						parentId: null, // creates root node
					},
					{
						onSuccess: (newGen) => {
							setSelectedNodeId(newGen.id);
						},
					}
				);
			},
		});
	};

	const handleInspectorUpload = (file: File) => {
		if (!activeNode) return;
		const parentId = activeNode.type === "placeholder" ? activeNode.parentId : activeNode.id;

		uploadImageMutation.mutate(file, {
			onSuccess: (uploadRes) => {
				createGenerationMutation.mutate(
					{
						imageUrl: uploadRes.imageUrl,
						parentId,
						prompt: "Uploaded branch room image",
						preset: activeNode.preset || "Scandinavian",
						creativityStrength: 0,
					},
					{
						onSuccess: (newGen) => {
							setSelectedNodeId(newGen.id);
						},
					}
				);
			},
		});
	};

	const handleNewBranch = () => {
		// Highlight placeholder or base generation
		const placeholder = nodes.find((n:VersionNode) => n.type === "placeholder");
		if (placeholder) {
			setSelectedNodeId(placeholder.id);
		}
		setMobileLeftOpen(false);
	};

	// Loading & Error States
	if (isProjectLoading || isTreeLoading) {
		return (
			<div className="h-screen w-screen flex flex-col bg-[#faf8f7]">
				<Navbar />
				<div className="flex-1 flex flex-col items-center justify-center">
					<Loader2 className="animate-spin text-primary mb-4" size={40} />
					<p className="text-sm font-medium text-on-surface-variant">
						Loading studio workspace...
					</p>
				</div>
			</div>
		);
	}

	if (treeError || !projectId) {
		return (
			<div className="h-screen w-screen flex flex-col bg-[#faf8f7]">
				<Navbar />
				<div className="flex-1 flex flex-col items-center justify-center text-center p-6">
					<AlertCircle className="text-red-500 mb-4" size={40} />
					<h2 className="text-lg font-bold text-primary mb-1">Failed to load Studio</h2>
					<p className="text-sm text-on-surface-variant max-w-sm mb-6">
						{treeError?.message || "Workspace does not exist or you do not have permission to view it."}
					</p>
					<button
						onClick={() => navigate("/projects")}
						className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg shadow cursor-pointer"
					>
						Back to Dashboard
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="h-screen w-screen flex flex-col overflow-hidden bg-[#faf8f7]">
			{/* Top Navigation */}
			<Navbar />

			{/* Main Studio Workspace container */}
			<div className="flex-1 flex pt-14 h-full w-full overflow-hidden relative">
				{/* Responsive Drawer Toggle Buttons */}
				<div className="absolute top-18 left-4 z-20 flex gap-2 md:hidden">
					<button
						onClick={() => setMobileLeftOpen(true)}
						className="p-2 bg-white/95 border border-[#efeded] text-on-surface rounded-lg shadow-sm backdrop-blur-sm pointer-events-auto cursor-pointer"
						title="Open Projects"
					>
						<Menu size={18} />
					</button>
				</div>

				<div className="absolute top-18 right-4 z-20 flex gap-2 lg:hidden">
					<button
						onClick={() => setMobileRightOpen(true)}
						className="p-2 bg-white/95 border border-[#efeded] text-on-surface rounded-lg shadow-sm backdrop-blur-sm pointer-events-auto cursor-pointer"
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
							onSelectNode={setSelectedNodeId}
							onNewBranch={handleNewBranch}
							projectName={project?.name}
							projectDesc={project?.description}
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

				{/* Empty Project Upload Layout vs Infinite Canvas */}
				{nodes.length === 0 ? (
					<div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-[#faf8f7]">
						<motion.div
							initial={{ opacity: 0, scale: 0.96 }}
							animate={{ opacity: 1, scale: 1 }}
							className="max-w-md w-full p-8 rounded-3xl bg-white border border-[#efeded] text-center flex flex-col items-center gap-6 shadow-[0_15px_40px_-15px_rgba(0,54,45,0.06)]"
						>
							<div className="w-16 h-16 bg-[#efeded]/60 rounded-2xl flex items-center justify-center text-primary border border-[#efeded]">
								<Upload size={26} />
							</div>
							<div>
								<h2 className="text-xl font-bold text-primary mb-2">Upload Base Room Image</h2>
								<p className="text-xs text-on-surface-variant leading-relaxed">
									Initialize this workspace by uploading a clear photo of the room you wish to design. This will establish the root node of your version tree.
								</p>
							</div>

							<label className="w-full flex items-center justify-center gap-2 h-12 bg-primary hover:bg-primary-container text-white text-sm font-semibold rounded-xl cursor-pointer shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]">
								<ImagePlus size={16} />
								<span>
									{uploadImageMutation.isPending || createGenerationMutation.isPending
										? "Uploading..."
										: "Select Room Image"}
								</span>
								<input
									type="file"
									accept="image/*"
									className="hidden"
									onChange={handleBaseImageUpload}
									disabled={uploadImageMutation.isPending || createGenerationMutation.isPending}
								/>
							</label>

							{(uploadImageMutation.isPending || createGenerationMutation.isPending) && (
								<div className="flex items-center gap-2 text-xs text-on-surface-variant animate-pulse font-medium">
									<Loader2 size={14} className="animate-spin text-primary" />
									<span>Processing base image...</span>
								</div>
							)}
						</motion.div>
					</div>
				) : (
					/* CENTER INFINITE CANVAS WORKSPACE */
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
								onSelectNode={setSelectedNodeId}
								onDeleteNode={handleDeleteNode}
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
				)}

				{/* RIGHT INSPECTOR PANEL - Persistent on desktop, drawer on tablet/mobile */}
				{nodes.length > 0 && (
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
									className="md:hidden absolute top-15 -left-10 p-2.5 bg-white border border-[#efeded] rounded-l-lg shadow-sm cursor-pointer"
								>
									<X size={18} />
								</button>
							)}
							<InspectorPanel
								activeNode={activeNode}
								onGenerate={handleGenerate}
								onUploadImage={handleInspectorUpload}
								isUploading={uploadImageMutation.isPending}
								isGenerating={createGenerationMutation.isPending}
							/>
						</div>
					</div>
				)}
				{/* Backdrop for mobile right drawer */}
				{mobileRightOpen && nodes.length > 0 && (
					<div
						className="md:hidden absolute inset-0 bg-black/20 w-screen h-screen z-20"
						onClick={() => setMobileRightOpen(false)}
					/>
				)}
			</div>
		</div>
	);
}
