import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
	Search,
	Plus,
	Layers,
	MoreVertical,
	X,
	Loader2,
	Bell,
	Star,
	Archive,
	Clock,
	FolderOpen,
} from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";

// ── Types ───────────────────────────────────────────────────────
interface Project {
	id: string;
	name: string;
	description: string;
	thumbnailUrl: string;
	versionCount: number;
	lastUpdated: string;
	isFavorite?: boolean;
	isArchived?: boolean;
}

// ── Mock Data ───────────────────────────────────────────────────
const MOCK_PROJECTS: Project[] = [
	{
		id: "proj_1",
		name: "Oak Ridge Loft",
		description:
			"Scandinavian inspired open-plan living with textured concrete.",
		thumbnailUrl:
			"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80",
		versionCount: 12,
		lastUpdated: "2h ago",
		isFavorite: true,
	},
	{
		id: "proj_2",
		name: "Emerald Study",
		description: "Sophisticated home office with deep hues and brass accents.",
		thumbnailUrl:
			"https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80",
		versionCount: 5,
		lastUpdated: "Oct 12",
	},
	{
		id: "proj_3",
		name: "Urban Sanctuary",
		description:
			"Master bedroom redesign focusing on organic textiles and curves.",
		thumbnailUrl:
			"https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80",
		versionCount: 24,
		lastUpdated: "Oct 10",
		isFavorite: true,
	},
	{
		id: "proj_4",
		name: "Terra Terrace",
		description: "Outdoor lounge concept with Mediterranean planting scheme.",
		thumbnailUrl:
			"https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80",
		versionCount: 8,
		lastUpdated: "Oct 08",
	},
];

// ── Filter Tabs ─────────────────────────────────────────────────
type FilterType = "all" | "recent" | "favorites" | "archived";

const FILTER_TABS: {
	key: FilterType;
	label: string;
	icon: typeof FolderOpen;
}[] = [
	{ key: "all", label: "All Projects", icon: FolderOpen },
	{ key: "recent", label: "Recent", icon: Clock },
	{ key: "favorites", label: "Favorites", icon: Star },
	{ key: "archived", label: "Archived", icon: Archive },
];

// ── Animation Variants ──────────────────────────────────────────
const containerVariants: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { staggerChildren: 0.08, delayChildren: 0.15 },
	},
};

const cardVariants: Variants = {
	hidden: { y: 24, opacity: 0 },
	visible: {
		y: 0,
		opacity: 1,
		transition: { type: "spring", stiffness: 120, damping: 14 },
	},
};

const overlayVariants: Variants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { duration: 0.2 } },
	exit: { opacity: 0, transition: { duration: 0.2, delay: 0.05 } },
};

const modalVariants: Variants = {
	hidden: { opacity: 0, scale: 0.95, y: 10 },
	visible: {
		opacity: 1,
		scale: 1,
		y: 0,
		transition: { type: "spring", stiffness: 300, damping: 25 },
	},
	exit: {
		opacity: 0,
		scale: 0.95,
		y: 10,
		transition: { duration: 0.15 },
	},
};

// ── Component ───────────────────────────────────────────────────
export function ProjectsPage() {
	const navigate = useNavigate();
	const [search, setSearch] = useState("");
	const [activeFilter, setActiveFilter] = useState<FilterType>("all");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [newProjectName, setNewProjectName] = useState("");
	const [newProjectDesc, setNewProjectDesc] = useState("");
	const nameInputRef = useRef<HTMLInputElement>(null);

	// Focus input when modal opens
	useEffect(() => {
		if (isModalOpen) {
			setTimeout(() => nameInputRef.current?.focus(), 100);
		}
	}, [isModalOpen]);

	// ── Filtering ───────────────────────────────────────────────
	const filteredProjects = MOCK_PROJECTS.filter((project) => {
		// search filter
		const matchesSearch =
			project.name.toLowerCase().includes(search.toLowerCase()) ||
			project.description.toLowerCase().includes(search.toLowerCase());

		// tab filter
		if (activeFilter === "favorites")
			return matchesSearch && project.isFavorite;
		if (activeFilter === "archived") return matchesSearch && project.isArchived;
		// "recent" and "all" show everything for now
		return matchesSearch;
	});

	// ── Handlers ────────────────────────────────────────────────
	const handleCreateProject = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newProjectName.trim()) return;
		setIsCreating(true);
		// Simulate API call
		setTimeout(() => {
			setIsCreating(false);
			setIsModalOpen(false);
			setNewProjectName("");
			setNewProjectDesc("");
		}, 1200);
	};

	const handleOpenProject = (projectId: string) => {
		// Navigate to studio with the project context
		navigate(`/studio?project=${projectId}`);
	};

	return (
		<div className="min-h-screen flex flex-col bg-[#faf8f7]">
			<Navbar />

			{/* ── Main Content ──────────────────────────────────── */}
			<main className="flex-1 pt-28 pb-20 px-6 max-w-7xl mx-auto w-full">
				{/* Header */}
				<motion.header
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="flex flex-col md:flex-row md:items-end justify-between mb-12"
				>
					<div>
						<h1 className="text-display text-primary mb-2">Projects</h1>
						<p className="text-body text-on-surface-variant max-w-lg">
							Manage and organize all your AI-generated interior design
							projects.
						</p>
					</div>
					<button
						onClick={() => setIsModalOpen(true)}
						className="mt-6 md:mt-0 inline-flex items-center gap-2 px-6 h-12 bg-primary text-white text-sm font-semibold rounded-xl shadow-md hover:bg-primary-container hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
					>
						<Plus size={18} />
						<span>New Project</span>
					</button>
				</motion.header>

				{/* Search & Filters */}
				<motion.section
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="mb-10"
				>
					<div className="flex flex-col gap-6">
						{/* Search Bar */}
						<div className="relative max-w-2xl">
							<Search
								size={18}
								className="absolute left-4 top-1/2 -translate-y-1/2 text-outline"
							/>
							<input
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search projects..."
								className="w-full pl-12 pr-4 py-3.5 bg-white border border-transparent rounded-full shadow-sm text-sm text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-outline-variant transition-all"
							/>
						</div>

						{/* Filter Tabs */}
						<div className="flex flex-wrap gap-2.5">
							{FILTER_TABS.map((tab) => {
								const isActive = activeFilter === tab.key;
								return (
									<button
										key={tab.key}
										onClick={() => setActiveFilter(tab.key)}
										className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
											isActive
												? "bg-primary text-white shadow-md"
												: "bg-white text-on-surface-variant hover:bg-[#efeded] shadow-sm"
										}`}
									>
										<tab.icon size={14} />
										<span>{tab.label}</span>
									</button>
								);
							})}
						</div>
					</div>
				</motion.section>

				{/* Projects Grid */}
				{filteredProjects.length > 0 ? (
					<motion.div
						variants={containerVariants}
						initial="hidden"
						animate="visible"
						className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7"
					>
						{filteredProjects.map((project) => (
							<ProjectCard
								key={project.id}
								project={project}
								onOpen={handleOpenProject}
							/>
						))}
					</motion.div>
				) : (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="flex flex-col items-center justify-center py-24 text-center"
					>
						<div className="w-16 h-16 bg-[#efeded] rounded-2xl flex items-center justify-center mb-4">
							<Search size={24} className="text-outline" />
						</div>
						<h3 className="text-lg font-semibold text-on-surface mb-1">
							No projects found
						</h3>
						<p className="text-sm text-on-surface-variant max-w-sm">
							{search
								? `No projects match "${search}". Try a different search term.`
								: "This category is empty. Create a new project to get started."}
						</p>
					</motion.div>
				)}
			</main>

			<Footer />

			{/* ── Create Project Modal ──────────────────────────── */}
			<AnimatePresence>
				{isModalOpen && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center">
						{/* Backdrop */}
						<motion.div
							variants={overlayVariants}
							initial="hidden"
							animate="visible"
							exit="exit"
							onClick={() => setIsModalOpen(false)}
							className="absolute inset-0 bg-primary/30 backdrop-blur-sm"
						/>

						{/* Modal Content */}
						<motion.div
							variants={modalVariants}
							initial="hidden"
							animate="visible"
							exit="exit"
							className="relative w-full max-w-md mx-4 p-8 glass-panel rounded-2xl shadow-2xl"
						>
							{/* Header */}
							<div className="flex justify-between items-center mb-6">
								<h2 className="text-headline-medium text-primary font-semibold">
									Create New Project
								</h2>
								<button
									onClick={() => setIsModalOpen(false)}
									className="p-1 text-outline hover:text-primary transition-colors"
								>
									<X size={20} />
								</button>
							</div>

							{/* Form */}
							<form
								onSubmit={handleCreateProject}
								className="flex flex-col gap-5"
							>
								<div>
									<label className="block text-sm font-medium text-primary mb-2">
										Project Name
									</label>
									<input
										ref={nameInputRef}
										type="text"
										value={newProjectName}
										onChange={(e) => setNewProjectName(e.target.value)}
										placeholder="e.g. Modern Loft Renovation"
										className="w-full px-4 py-3 bg-white/50 border border-outline-variant rounded-xl text-sm text-on-surface placeholder:text-outline/50 focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-primary mb-2">
										Description
									</label>
									<textarea
										value={newProjectDesc}
										onChange={(e) => setNewProjectDesc(e.target.value)}
										placeholder="Briefly describe the vision..."
										rows={3}
										className="w-full px-4 py-3 bg-white/50 border border-outline-variant rounded-xl text-sm text-on-surface placeholder:text-outline/50 focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all outline-none resize-none"
									/>
								</div>

								{/* Actions */}
								<div className="flex gap-3 pt-2">
									<button
										type="button"
										onClick={() => setIsModalOpen(false)}
										className="flex-1 px-5 py-3 border border-outline-variant text-on-surface-variant rounded-xl text-sm font-medium hover:bg-[#f5f3f3] transition-all"
									>
										Cancel
									</button>
									<button
										type="submit"
										disabled={isCreating || !newProjectName.trim()}
										className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
											isCreating || !newProjectName.trim()
												? "opacity-60 cursor-not-allowed hover:scale-100"
												: ""
										}`}
									>
										{isCreating ? (
											<>
												<Loader2 size={16} className="animate-spin" />
												<span>Creating...</span>
											</>
										) : (
											<span>Create Project</span>
										)}
									</button>
								</div>
							</form>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
}

// ── Project Card Component ──────────────────────────────────────
function ProjectCard({
	project,
	onOpen,
}: {
	project: Project;
	onOpen: (id: string) => void;
}) {
	const [menuOpen, setMenuOpen] = useState(false);

	return (
		<motion.div
			variants={cardVariants}
			onClick={() => onOpen(project.id)}
			className="bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(0,54,45,0.12)]"
		>
			{/* Thumbnail */}
			<div className="relative h-48 overflow-hidden">
				<img
					src={project.thumbnailUrl}
					alt={project.name}
					className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
				/>

				{/* Gradient overlay on hover */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

				{/* Version Badge */}
				<div className="absolute top-3 right-3 bg-white/85 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
					<Layers size={12} className="text-primary" />
					<span className="text-[10px] font-bold text-primary">
						{project.versionCount} Versions
					</span>
				</div>
			</div>

			{/* Content */}
			<div className="p-5">
				<div className="flex justify-between items-start mb-1">
					<h3 className="text-base font-bold text-primary truncate pr-2">
						{project.name}
					</h3>
					<button
						onClick={(e) => {
							e.stopPropagation();
							setMenuOpen(!menuOpen);
						}}
						className="p-0.5 text-outline hover:text-primary transition-colors flex-shrink-0"
					>
						<MoreVertical size={16} />
					</button>
				</div>

				<p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 mb-4">
					{project.description}
				</p>

				<span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-outline">
					Last updated {project.lastUpdated}
				</span>
			</div>
		</motion.div>
	);
}
