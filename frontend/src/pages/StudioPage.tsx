import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Box, Menu, Sliders, X, Upload, ImagePlus, Loader2, AlertCircle, Calendar, Sparkles, Eye } from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { LeftSidebar } from "../components/sidebar/LeftSidebar";
import { Canvas } from "../components/workspace/Canvas";
import { VersionTree } from "../components/version-tree/VersionTree";
import { CanvasToolbar } from "../components/toolbar/CanvasToolbar";
import { InspectorPanel } from "../components/inspector/InspectorPanel";
import { useCanvas } from "../hooks/useCanvas";
import { useZoom } from "../hooks/useZoom";
import { useGetProjectDetail } from "../hooks/useProject";
import { useGetProjectGenerations } from "../hooks/useProjectTree";
import { useVersionTree } from "../hooks/useVersionTree";
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

	// Fetch dynamic backend project context
	const { data: project, isLoading: isProjectLoading } = useGetProjectDetail(projectId);
	const {
		data: generations = [],
		isLoading: isGenerationsLoading,
		error: generationsError,
	} = useGetProjectGenerations(projectId);

	// Client-side Version Tree state & layout computation
	const { nodes, edges, selectedNodeId, selectNode } = useVersionTree(generations);

	// Fullscreen Preview Modal state
	const [previewNode, setPreviewNode] = useState<VersionNode | null>(null);

	// Escape key handler to close the modal
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setPreviewNode(null);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	// Mutations
	const uploadImageMutation = useUploadImage();
	const createGenerationMutation = useCreateGeneration(projectId!);
	const deleteGenerationMutation = useDeleteGeneration(projectId!);

	const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
	const [mobileRightOpen, setMobileRightOpen] = useState(false);

	// Find details of the selected node
	const activeNode = nodes.find((n: VersionNode) => n.id === selectedNodeId) || null;

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
					selectNode(newGen.id);
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
				const rootNode = nodes.find((n: VersionNode) => !n.parentId);
				if (rootNode && rootNode.id !== id) {
					selectNode(rootNode.id);
				} else {
					selectNode(null);
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
							selectNode(newGen.id);
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
							selectNode(newGen.id);
						},
					}
				);
			},
		});
	};

	const [onboardingPrompt, setOnboardingPrompt] = useState("");

	const handleBasePromptGeneration = (e: React.FormEvent) => {
		e.preventDefault();
		if (!onboardingPrompt.trim() || createGenerationMutation.isPending) return;

		createGenerationMutation.mutate(
			{
				parentId: null,
				prompt: onboardingPrompt.trim(),
				preset: "Minimalist",
				creativityStrength: 0,
				generationMode: "restyle",
			},
			{
				onSuccess: (newGen) => {
					selectNode(newGen.id);
					setOnboardingPrompt("");
				},
			}
		);
	};

	const handleNewBranch = () => {
		// Highlight placeholder or base generation
		const placeholder = nodes.find((n: VersionNode) => n.type === "placeholder");
		if (placeholder) {
			selectNode(placeholder.id);
		}
		setMobileLeftOpen(false);
	};

	const handleEditNode = (node: VersionNode, mode: "interior-modification" | "furniture-placement" | "object-move") => {
		// Find the full generation record to pass projectId and imageUrl
		const genRecord = generations.find((g: any) => g.id === node.id);
		navigate(`/editor/${node.id}?mode=${mode}`, {
			state: {
				version: {
					...node,
					projectId: projectId,
					imageUrl: genRecord?.imageUrl || node.image,
				},
			},
		});
	};

	const handleView3D = (node: VersionNode) => {
		if (!projectId || node.type === "placeholder") return;
		navigate(`/project/${projectId}/generation/${node.id}/3d`);
	};

	// Loading & Error States
	if (isProjectLoading || isGenerationsLoading) {
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

	if (generationsError || !projectId) {
		return (
			<div className="h-screen w-screen flex flex-col bg-[#faf8f7]">
				<Navbar />
				<div className="flex-1 flex flex-col items-center justify-center text-center p-6">
					<AlertCircle className="text-red-500 mb-4" size={40} />
					<h2 className="text-lg font-bold text-primary mb-1">Failed to load Studio</h2>
					<p className="text-sm text-on-surface-variant max-w-sm mb-6">
						{generationsError?.message || "Workspace does not exist or you do not have permission to view it."}
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
							onSelectNode={selectNode}
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

				{/* Project Onboarding Screen (Two options to start) */}
				{nodes.length === 0 ? (
					<div className="flex-1 h-full flex flex-col items-center justify-center p-6 md:p-12 bg-[#faf8f7] overflow-y-auto">
						<motion.div
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							className="max-w-4xl w-full flex flex-col gap-8 text-center"
						>
							<div>
								<span className="text-[10px] uppercase tracking-[0.15em] font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
									Project Onboarding
								</span>
								<h2 className="text-3xl font-extrabold text-primary mt-4 tracking-tight">
									Choose how you want to begin
								</h2>
								<p className="text-xs text-on-surface-variant max-w-md mx-auto mt-2 leading-relaxed">
									Initialize your interior design studio workspace. Select a reference room photo or generate a brand new space from a text prompt.
								</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full items-stretch">
								{/* Option 1: Upload Room Image */}
								<div className="flex flex-col p-8 rounded-3xl bg-white border border-[#efeded] hover:border-primary/20 shadow-[0_15px_40px_-15px_rgba(0,54,45,0.03)] hover:shadow-[0_20px_50px_-15px_rgba(0,54,45,0.06)] transition-all duration-300 items-center justify-between text-center gap-6 group">
									<div className="w-14 h-14 bg-[#efeded]/60 rounded-2xl flex items-center justify-center text-primary border border-[#efeded] group-hover:scale-105 transition-transform">
										<Upload size={22} />
									</div>
									<div className="flex-1 flex flex-col gap-2">
										<h3 className="text-base font-bold text-primary">Upload Room Image</h3>
										<p className="text-xs text-on-surface-variant leading-relaxed px-2">
											Start with an existing photo of a room. This enables interior restyling and object furniture placement on top of your photo.
										</p>
									</div>

									<label className="w-full flex items-center justify-center gap-2 h-11 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]">
										<ImagePlus size={14} />
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
								</div>

								{/* Option 2: Start From Prompt */}
								<form
									onSubmit={handleBasePromptGeneration}
									className="flex flex-col p-8 rounded-3xl bg-white border border-[#efeded] hover:border-primary/20 shadow-[0_15px_40px_-15px_rgba(0,54,45,0.03)] hover:shadow-[0_20px_50px_-15px_rgba(0,54,45,0.06)] transition-all duration-300 items-center justify-between text-center gap-6"
								>
									<div className="w-14 h-14 bg-[#efeded]/60 rounded-2xl flex items-center justify-center text-primary border border-[#efeded]">
										<Sparkles size={22} />
									</div>
									<div className="w-full flex flex-col gap-2">
										<h3 className="text-base font-bold text-primary">Start From Prompt</h3>
										<p className="text-xs text-on-surface-variant leading-relaxed px-2">
											Generate a completely new room base from a description using FLUX Schnell.
										</p>
									</div>

									<div className="w-full">
										<textarea
											value={onboardingPrompt}
											onChange={(e) => setOnboardingPrompt(e.target.value)}
											placeholder="e.g., 'A modern penthouse living room with concrete walls, modular beige sofa, and large windows looking over Manhattan...'"
											required
											rows={3}
											disabled={uploadImageMutation.isPending || createGenerationMutation.isPending}
											className="w-full p-3 text-xs text-on-surface placeholder:text-outline/60 bg-surface-container-low border border-[#efeded] rounded-xl focus:outline-none focus:border-primary/30 focus:bg-white resize-none"
										/>
									</div>

									<button
										type="submit"
										disabled={!onboardingPrompt.trim() || uploadImageMutation.isPending || createGenerationMutation.isPending}
										className={`w-full flex items-center justify-center gap-2 h-11 text-xs font-bold rounded-xl shadow-md transition-all ${
											onboardingPrompt.trim() && !uploadImageMutation.isPending && !createGenerationMutation.isPending
												? "bg-[#00362d] text-white hover:bg-[#1a4d43] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
												: "bg-[#efeded] text-[#c0c8c5] cursor-not-allowed"
										}`}
									>
										<Sparkles size={14} />
										<span>Generate Room Base</span>
									</button>
								</form>
							</div>

							{(uploadImageMutation.isPending || createGenerationMutation.isPending) && (
								<div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant font-medium animate-pulse mt-4 bg-white/60 border border-[#efeded] py-3 px-6 rounded-2xl max-w-sm mx-auto shadow-sm backdrop-blur-sm">
									<Loader2 size={14} className="animate-spin text-primary" />
									<span>Processing base workspace image...</span>
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
								onSelectNode={selectNode}
								onDeleteNode={handleDeleteNode}
								onPreviewNode={setPreviewNode}
								onView3D={handleView3D}
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
									className="md:hidden absolute top-15 -left-10 p-2.5 bg-white border border-[#efeded] rounded-r-lg shadow-sm cursor-pointer"
								>
									<X size={18} />
								</button>
							)}
							<InspectorPanel
								activeNode={activeNode}
								onGenerate={handleGenerate}
								onUploadImage={handleInspectorUpload}
								onEditNode={handleEditNode}
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

				{/* Fullscreen Preview Modal */}
				<AnimatePresence>
					{previewNode && (
						<div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 select-none">
							{/* Backdrop */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								onClick={() => setPreviewNode(null)}
								className="absolute inset-0 bg-[#001f1a]/85 backdrop-blur-md pointer-events-auto cursor-pointer"
							/>

							{/* Modal Content */}
							<motion.div
								initial={{ opacity: 0, scale: 0.95, y: 15 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95, y: 15 }}
								transition={{ type: "spring", stiffness: 350, damping: 28 }}
								className="relative w-full max-w-5xl h-[85vh] md:h-[650px] bg-white rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-[#efeded]/30 flex flex-col md:flex-row pointer-events-auto"
							>
								{/* Close button - Absolute top-right */}
								<button
									onClick={() => setPreviewNode(null)}
									className="absolute top-4 right-4 z-10 p-2 bg-[#00362d]/10 hover:bg-[#00362d]/25 text-[#00362d] md:text-white md:bg-black/30 md:hover:bg-black/50 hover:scale-105 active:scale-95 rounded-full transition-all cursor-pointer shadow-sm flex items-center justify-center"
									title="Close Preview"
								>
									<X size={18} />
								</button>

								{/* Left Column: Visual Pane */}
								<div className="flex-1 md:h-full bg-black/95 flex items-center justify-center p-4 relative overflow-hidden">
									{previewNode.image ? (
										<img
											src={previewNode.image}
											alt={previewNode.title}
											className="w-full h-full object-contain max-h-[40vh] md:max-h-full rounded-lg"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center text-outline-variant font-medium text-sm">
											No Preview Image Available
										</div>
									)}

									{/* Watermark/Version title overlay */}
									<div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-sm px-3.5 py-1.5 rounded-lg border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm">
										<Eye size={12} className="text-[#3bcca0]" />
										<span>{previewNode.title} Preview</span>
									</div>
								</div>

								{/* Right Column: Metadata Sidebar */}
								<div className="w-full md:w-[380px] md:h-full bg-[#faf8f7] border-t md:border-t-0 md:border-l border-[#efeded] flex flex-col justify-between p-6 md:p-8 overflow-y-auto">
									<div className="flex flex-col gap-6">
										{/* Top Header */}
										<div>
											<span className="text-[10px] uppercase tracking-[0.12em] font-bold text-primary/60 bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10">
												Version Details
											</span>
											<h2 className="text-xl font-bold text-primary mt-3 leading-tight">
												{previewNode.title}
											</h2>
											<p className="text-[11px] text-[#707976] mt-1 flex items-center gap-1">
												<Calendar size={11} />
												<span>Generated {previewNode.createdAt}</span>
											</p>
										</div>

										<hr className="border-[#efeded]" />

										{/* Generation Parameters */}
										<div className="flex flex-col gap-4">
											<h3 className="text-xs font-bold uppercase tracking-wider text-primary/80">
												Parameters
											</h3>

											{/* Parameter Items */}
											<div className="grid grid-cols-2 gap-3.5">
												{/* Preset Style */}
												<div className="bg-white border border-[#efeded] rounded-xl p-3 shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
													<span className="text-[10px] font-semibold text-[#707976] block mb-1">Preset Style</span>
													<span className="text-xs font-bold text-primary flex items-center gap-1">
														<Sparkles size={12} className="text-primary/70" />
														{previewNode.preset || "Default"}
													</span>
												</div>

												{/* Creativity Strength */}
												<div className="bg-white border border-[#efeded] rounded-xl p-3 shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
													<span className="text-[10px] font-semibold text-[#707976] block mb-1">AI Strength</span>
													<span className="text-xs font-bold text-primary">
														{previewNode.creativityStrength !== undefined 
															? `${previewNode.creativityStrength}%` 
															: "N/A"}
													</span>
												</div>

												{/* Mode */}
												<div className="bg-white border border-[#efeded] rounded-xl p-3 shadow-[0_2px_4px_rgba(0,0,0,0.01)] col-span-2">
													<span className="text-[10px] font-semibold text-[#707976] block mb-1">Generation Mode</span>
													<span className="text-xs font-bold text-primary capitalize">
														{previewNode.generationMode === "restyle" 
															? "Style Restructuring" 
															: previewNode.generationMode === "furnish-empty" 
															? "Furnish Empty Room" 
															: "Original Upload"}
													</span>
												</div>
											</div>
										</div>

										{/* AI Prompt */}
										{previewNode.prompt && (
											<div className="flex flex-col gap-2">
												<h3 className="text-xs font-bold uppercase tracking-wider text-primary/80">
													AI Prompt
												</h3>
												<div className="bg-white border border-[#efeded] rounded-xl p-4 shadow-[0_2px_4px_rgba(0,0,0,0.01)] text-xs text-on-surface-variant leading-relaxed italic max-h-[140px] overflow-y-auto">
													"{previewNode.prompt}"
												</div>
											</div>
										)}
									</div>

									{/* Bottom Action */}
									<div className="mt-8 pt-4 border-t border-[#efeded]/65 space-y-2">
										<button
											onClick={() => handleView3D(previewNode)}
											className="w-full h-11 border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
										>
											<Box size={15} />
											<span>Open 3D View</span>
										</button>
										<button
											onClick={() => setPreviewNode(null)}
											className="w-full h-11 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
										>
											<span>Back to Tree Canvas</span>
										</button>
									</div>
								</div>
							</motion.div>
						</div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
