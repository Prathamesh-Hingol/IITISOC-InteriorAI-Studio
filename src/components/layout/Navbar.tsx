import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Showcase", path: "/" },
    { name: "Projects", path: "/projects" },
    { name: "How It Works", path: "/demo" },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-14 border-b transition-all duration-300 ${
        isScrolled || location.pathname === "/studio"
          ? "bg-white/70 backdrop-blur-md border-[#efeded]/80"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Left Side: Brand Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="font-sans text-xl font-bold tracking-tight text-primary">
            InteriorAI Studio
          </span>
        </Link>

        {/* Center: Navigation Links */}
        <div className="hidden md:flex items-center gap-8 h-full">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-primary relative py-4 ${
                  active ? "text-on-surface" : "text-on-surface-variant"
                }`}
              >
                {link.name}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right Side: CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            to="/"
            className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Log In
          </Link>
          <Link
            to="/projects"
            className="inline-flex items-center justify-center bg-primary hover:bg-primary-container text-white text-sm font-medium px-4 h-9 rounded-lg transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            Launch Studio
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1 text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-white border-b border-[#efeded] px-6 py-4 flex flex-col gap-4 shadow-lg animate-fade-in">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`text-base font-medium py-1 transition-colors ${
                isActive(link.path) ? "text-primary font-semibold" : "text-on-surface-variant"
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="h-px bg-[#efeded] my-2" />
          <div className="flex flex-col gap-3">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-on-surface-variant py-1"
            >
              Log In
            </Link>
            <Link
              to="/projects"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center justify-center bg-primary text-white text-base font-medium py-2.5 rounded-lg transition-colors"
            >
              Launch Studio
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
