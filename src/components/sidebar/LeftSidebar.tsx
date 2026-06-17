import {
	Folder,
	History,
	Settings,
	Plus,
} from "lucide-react";
import type { VersionNode } from "../../types";

interface LeftSidebarProps {
	nodes: VersionNode[];
	selectedNodeId: string | null;
	onSelectNode: (id: string) => void;
	onNewBranch?: () => void;
}

export function LeftSidebar({
	nodes,
	selectedNodeId,
	onSelectNode,
	onNewBranch,
}: LeftSidebarProps) {
	// Sort versions to display recent ones (nodes with images)
	const historyNodes = nodes
		.filter((n) => n.type !== "placeholder")
		.sort((a, b) => {
			// Keep v2 on top of v1 for chronological view
			if (a.id === "v2") return -1;
			if (b.id === "v2") return 1;
			return b.createdAt.localeCompare(a.createdAt);
		});

	const navigation = [{ name: "History", icon: History, active: true }];

	return (
		<aside className="w-70 h-full flex flex-col border-r border-[#efeded] bg-white select-none">
			{/* Project Header */}
			<div className="p-6 pb-4">
				<h1 className="text-xl font-bold tracking-tight text-on-surface">
					Project Alpha
				</h1>
				<p className="text-xs text-on-surface-variant mt-0.5 font-medium">
					Modern Minimalist Loft
				</p>
			</div>

			{/* New Branch Button */}
			<div className="px-6 pb-6">
				<button
					onClick={onNewBranch}
					className="w-full flex items-center justify-center gap-2 h-9 text-sm font-medium text-on-surface bg-surface hover:bg-[#efeded] border border-[#c0c8c5] hover:border-[#707976] rounded-lg transition-all duration-200"
				>
					<Plus size={16} className="text-on-surface-variant" />
					<span>New Branch</span>
				</button>
			</div>

			{/* Navigation List */}
			<div className="px-3 flex flex-col gap-1">
				{navigation.map((item) => {
					const Icon = item.icon;
					return (
						<button
							key={item.name}
							className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
								item.active
									? "bg-[#cbf4ec] text-[#00362d]"
									: "text-on-surface-variant hover:text-on-surface hover:bg-[#f5f3f3]"
							}`}
						>
							<Icon
								size={18}
								className={
									item.active ? "text-[#00362d]" : "text-on-surface-variant"
								}
							/>
							<span>{item.name}</span>
						</button>
					);
				})}
			</div>

			{/* Divider */}
			<div className="h-px bg-[#efeded] mx-6 my-6" />

			{/* Recent Versions Timeline */}
			<div className="px-6 flex-1 overflow-y-auto">
				<h2 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-4">
					Recent Versions
				</h2>

				<div className="relative pl-6 border-l border-[#c0c8c5]/40 ml-2.5 flex flex-col gap-4">
					{historyNodes.map((node) => {
						const isSelected = selectedNodeId === node.id;

						return (
							<div key={node.id} className="relative group">
								{/* Timeline node circle */}
								<div
									onClick={() => onSelectNode(node.id)}
									className={`absolute -left-7.75 top-6 w-3 h-3 rounded-full border-2 cursor-pointer transition-all ${
										isSelected
											? "bg-primary border-primary scale-125 ring-4 ring-primary/10"
											: "bg-[#fbf9f9] border-[#c0c8c5] hover:border-on-surface-variant"
									}`}
								/>

								{/* Node Card */}
								<div
									onClick={() => onSelectNode(node.id)}
									className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-all ${
										isSelected
											? "bg-white border-primary shadow-sm"
											: "bg-[#f5f3f3]/60 hover:bg-[#efeded]/70 border-transparent hover:border-[#c0c8c5]/40"
									}`}
								>
									{node.image ? (
										<img
											src={node.image}
											alt={node.title}
											className="w-10 h-10 object-cover rounded-md bg-[#efeded]"
										/>
									) : (
										<div className="w-10 h-10 bg-[#efeded] rounded-md flex items-center justify-center">
											<Folder size={14} className="text-outline" />
										</div>
									)}

									<div className="min-w-0">
										<h3 className="text-xs font-semibold text-on-surface truncate">
											{node.title}
										</h3>
										<p className="text-[10px] text-on-surface-variant mt-0.5">
											{node.createdAt.split(" • ")[0]}
										</p>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Settings Row */}
			<div className="p-4 border-t border-[#efeded]">
				<button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-[#f5f3f3] rounded-lg transition-colors">
					<Settings size={18} className="text-on-surface-variant" />
					<span>Settings</span>
				</button>
			</div>
		</aside>
	);
}
