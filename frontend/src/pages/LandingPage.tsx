import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Link } from "react-router-dom";
import {
	ArrowRight,
	Play,
	Upload,
	Edit,
	Eye,
	Palette,
	Armchair,
	History,
	Sparkles,
} from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import bg from "../assets/bg.png";

export function LandingPage() {
	const containerVariants: Variants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { staggerChildren: 0.15, delayChildren: 0.1 },
		},
	};

	const itemVariants: Variants = {
		hidden: { y: 30, opacity: 0 },
		visible: {
			y: 0,
			opacity: 1,
			transition: { type: "spring" as const, stiffness: 100 },
		},
		hover: {
			scale: 1.05,
			boxShadow: "0px 8px 20px rgba(0,0,0,0.15)",
			transition: { duration: 0.3, ease: "easeInOut" },
		},
	};

	return (
		<div className="min-h-screen flex flex-col bg-[#fbf9f9]">
			<Navbar />

			{/* Hero Section */}
			<section className="relative min-h-[90vh] flex items-center justify-center pt-20 overflow-hidden px-6">
				{/* Background Image with Overlay */}
				<div className="absolute inset-0 z-0">
					<img
						src={bg}
						alt="Modern Minimalist Loft"
						className="w-full h-full object-cover"
					/>
					<div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/50 to-[#fbf9f9]" />
				</div>

				{/* Content */}
				<div className="relative z-10 max-w-4xl text-center flex flex-col items-center">
					{/* Tag Pill */}
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#efeded] shadow-sm mb-6 backdrop-blur-sm"
					>
						<Sparkles size={12} className="text-primary" />
						<span className="text-[10px] font-bold uppercase tracking-wider text-primary">
							Introducing AI Generation 2.0
						</span>
					</motion.div>

					{/* Heading */}
					<motion.h1
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.1 }}
						className="font-sans text-4xl md:text-5xl font-bold tracking-tight text-on-surface leading-tight"
					>
						Redesign Your Space <br />
						Before You Spend
					</motion.h1>

					{/* Subtitle */}
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.2 }}
						className="text-base md:text-lg text-on-surface-variant max-w-2xl mt-6 leading-relaxed"
					>
						Upload your room, experiment with colors, furniture, and styles
						using AI-powered interior design. The ultimate tool for spatial
						harmony and precision craftsmanship.
					</motion.p>

					{/* Buttons */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.3 }}
						className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto"
					>
						<Link
							to="/studio"
							className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-white text-sm font-semibold px-6 h-11 rounded-lg transition-all duration-200 shadow-md hover:scale-[1.02] active:scale-[0.98]"
						>
							<span>Start Designing</span>
							<ArrowRight size={16} />
						</Link>
						<button
							onClick={() => alert("Watch Demo Video")}
							className="inline-flex items-center justify-center gap-2 bg-white/70 hover:bg-white text-on-surface border border-[#c0c8c5] text-sm font-semibold px-6 h-11 rounded-lg transition-all duration-200 shadow-sm backdrop-blur-sm hover:scale-[1.02] active:scale-[0.98]"
						>
							<Play
								size={16}
								className="text-on-surface-variant fill-on-surface-variant/20"
							/>
							<span>Watch Demo</span>
						</button>
					</motion.div>
				</div>
			</section>

			{/* How It Works Section */}
			<section
				id="how-it-works"
				className="py-20 px-6 bg-white border-t border-[#efeded]"
			>
				<div className="max-w-7xl mx-auto">
					{/* Header */}
					<div className="text-center max-w-2xl mx-auto mb-16">
						<h2 className="text-2xl font-bold tracking-tight text-on-surface">
							How It Works
						</h2>
						<p className="text-sm text-on-surface-variant mt-3 leading-relaxed">
							A streamlined workflow designed for professionals and high-end
							homeowners. Transform spaces in three intuitive steps.
						</p>
					</div>

					{/* Step Grid */}
					<motion.div
						variants={containerVariants}
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-100px" }}
						className="grid grid-cols-1 md:grid-cols-3 gap-8"
					>
						{/* Step 1 */}
						<motion.div
							variants={itemVariants}
							whileHover={{
								scale: 1.05,
								boxShadow: "0px 8px 20px rgba(0,0,0,0.15)",
								transition: { duration: 0.3, ease: "easeInOut" },
							}}
							className="bg-[#fbf9f9] border border-[#efeded] p-8 rounded-xl flex flex-col justify-between h-[280px] shadow-sm relative group hover:shadow-md transition-shadow duration-300"
						>
							<span className="absolute top-6 right-8 text-4xl font-bold text-[#e3e2e2]/60 select-none">
								01
							</span>
							<div className="w-12 h-12 bg-white border border-[#efeded] text-on-surface rounded-lg flex items-center justify-center shadow-sm">
								<Upload size={20} />
							</div>
							<div>
								<h3 className="text-lg font-bold text-on-surface mb-2">
									Upload
								</h3>
								<p className="text-xs text-on-surface-variant leading-relaxed">
									Simply upload a clear photo of your current space. Our AI
									analyzes the room's architecture and lighting.
								</p>
							</div>
						</motion.div>

						{/* Step 2 */}
						<motion.div
							variants={itemVariants}
							whileHover={{
								scale: 1.05,
								boxShadow: "0px 8px 20px rgba(0,0,0,0.15)",
								transition: { duration: 0.3, ease: "easeInOut" },
							}}
							className="bg-[#fbf9f9] border border-[#efeded] p-8 rounded-xl flex flex-col justify-between h-[280px] shadow-sm relative group hover:shadow-md transition-shadow duration-300"
						>
							<span className="absolute top-6 right-8 text-4xl font-bold text-[#e3e2e2]/60 select-none">
								02
							</span>
							<div className="w-12 h-12 bg-white border border-[#efeded] text-on-surface rounded-lg flex items-center justify-center shadow-sm">
								<Edit size={20} />
							</div>
							<div>
								<h3 className="text-lg font-bold text-on-surface mb-2">
									Describe
								</h3>
								<p className="text-xs text-on-surface-variant leading-relaxed">
									Specify your desired style, color palette, or furniture types
									using simple language or selecting from our curated presets.
								</p>
							</div>
						</motion.div>

						{/* Step 3 */}
						<motion.div
							variants={itemVariants}
							whileHover={{
								scale: 1.05,
								boxShadow: "0px 8px 20px rgba(0,0,0,0.15)",
								transition: { duration: 0.3, ease: "easeInOut" },
							}}
							className="bg-[#fbf9f9] border border-[#efeded] p-8 rounded-xl flex flex-col justify-between h-[280px] shadow-sm relative group hover:shadow-md transition-shadow duration-300"
						>
							<span className="absolute top-6 right-8 text-4xl font-bold text-[#e3e2e2]/60 select-none">
								03
							</span>
							<div className="w-12 h-12 bg-white border border-[#efeded] text-on-surface rounded-lg flex items-center justify-center shadow-sm">
								<Eye size={20} />
							</div>
							<div>
								<h3 className="text-lg font-bold text-on-surface mb-2">
									Generate
								</h3>
								<p className="text-xs text-on-surface-variant leading-relaxed">
									Instantly view stunning, photorealistic variations of your
									room. Iterate endlessly until the spatial harmony is perfect.
								</p>
							</div>
						</motion.div>
					</motion.div>
				</div>
			</section>

			{/* Bento Feature Grid Section */}
			<section className="py-20 px-6 bg-[#fbf9f9] border-t border-[#efeded]">
				<div className="max-w-7xl mx-auto">
					{/* Header */}
					<div className="max-w-2xl mb-16">
						<h2 className="text-2xl font-bold tracking-tight text-on-surface">
							Professional Tools
						</h2>
						<p className="text-sm text-on-surface-variant mt-3 leading-relaxed">
							A comprehensive suite of design tools engineered to recede to the
							background, letting your creativity take center stage.
						</p>
					</div>

					{/* Bento Layout Grid */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-[240px]">
						{/* Real-time comparison - Tall Card */}
						<div className="lg:row-span-2 bg-white border border-[#efeded] p-8 rounded-2xl flex flex-col justify-between overflow-hidden relative group hover:shadow-md transition-all duration-300 shadow-sm">
							<div className="z-10">
								<div className="w-10 h-10 bg-[#fbf9f9] border border-[#efeded] text-[#707976] rounded-lg flex items-center justify-center shadow-sm mb-4">
									<Palette size={18} />
								</div>
								<h3 className="text-lg font-bold text-on-surface mb-2">
									Real-Time Visual Comparison
								</h3>
								<p className="text-xs text-on-surface-variant leading-relaxed">
									Seamlessly swipe between original and generated concepts to
									evaluate architectural impact and flow.
								</p>
							</div>
							<div className="h-44 w-full mt-4 bg-gradient-to-tr from-[#00362d]/10 to-[#cbf4ec]/30 rounded-xl relative overflow-hidden border border-[#efeded]/80">
								<img
									src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=400&q=80"
									alt="Splitscreen visual comparison"
									className="w-full h-full object-cover filter saturate-50 group-hover:scale-105 transition-transform duration-700"
								/>
							</div>
						</div>

						{/* AI Recoloring - Small Card */}
						<div className="bg-white border border-[#efeded] p-8 rounded-2xl flex flex-col justify-between hover:shadow-md transition-all duration-300 shadow-sm">
							<div>
								<div className="w-10 h-10 bg-[#fbf9f9] border border-[#efeded] text-[#707976] rounded-lg flex items-center justify-center shadow-sm mb-4">
									<Palette size={18} />
								</div>
								<h3 className="text-sm font-bold text-on-surface mb-2">
									AI Recoloring
								</h3>
								<p className="text-xs text-on-surface-variant leading-relaxed">
									Intelligently map new color palettes to walls and textiles
									while preserving natural shadows.
								</p>
							</div>
						</div>

						{/* Fast AI Generation - Wide Card */}
						<div className="bg-[#00362d] text-white p-8 rounded-2xl flex items-center justify-between hover:shadow-lg transition-all duration-300 shadow-sm relative overflow-hidden group">
							<div className="max-w-[70%] z-10">
								<h3 className="text-lg font-bold mb-2">Fast AI Generation</h3>
								<p className="text-xs text-white/80 leading-relaxed">
									From concept to high-fidelity render in seconds, not hours.
								</p>
							</div>
							<div className="w-12 h-12 bg-white/10 text-[#cbf4ec] rounded-full flex items-center justify-center shadow-sm border border-white/20 z-10">
								<Sparkles
									size={22}
									className="group-hover:rotate-30 transition-transform"
								/>
							</div>
							{/* background decoration */}
							<div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full translate-x-10 translate-y-10 blur-xl" />
						</div>

						{/* Furniture Placement - Medium Card */}
						<div className="bg-white border border-[#efeded] p-8 rounded-2xl flex flex-col justify-between hover:shadow-md transition-all duration-300 shadow-sm">
							<div>
								<div className="w-10 h-10 bg-[#fbf9f9] border border-[#efeded] text-[#707976] rounded-lg flex items-center justify-center shadow-sm mb-4">
									<Armchair size={18} />
								</div>
								<h3 className="text-sm font-bold text-on-surface mb-2">
									Furniture Placement
								</h3>
								<p className="text-xs text-on-surface-variant leading-relaxed">
									Drop in true-to-scale designer pieces.
								</p>
							</div>
						</div>

						{/* Design Iteration - Medium Card */}
						<div className="bg-white border border-[#efeded] p-8 rounded-2xl flex flex-col justify-between hover:shadow-md transition-all duration-300 shadow-sm">
							<div>
								<div className="w-10 h-10 bg-[#fbf9f9] border border-[#efeded] text-[#707976] rounded-lg flex items-center justify-center shadow-sm mb-4">
									<History size={18} />
								</div>
								<h3 className="text-sm font-bold text-on-surface mb-2">
									Design Iteration
								</h3>
								<p className="text-xs text-on-surface-variant leading-relaxed">
									Branching version control for spaces.
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			<Footer />
		</div>
	);
}
