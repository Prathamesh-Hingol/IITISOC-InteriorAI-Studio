import { Link } from "react-router-dom";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const sections = [
    {
      title: "Product",
      links: [
        { label: "Showcase", path: "/" },
        { label: "Pricing", path: "/#pricing" },
        { label: "API Docs", path: "/#api-docs" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", path: "/#about" },
        { label: "Careers", path: "/#careers" },
        { label: "Contact Support", path: "/#support" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", path: "/#privacy" },
        { label: "Terms of Service", path: "/#terms" },
      ],
    },
  ];

  return (
    <footer className="bg-white border-t border-[#efeded] py-16 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* Left Side: Brand Statement */}
        <div className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <h2 className="font-sans text-xl font-bold tracking-tight text-primary mb-3">
              InteriorAI Studio
            </h2>
            <p className="text-sm text-on-surface-variant max-w-xs leading-relaxed">
              Precision Craftsmanship for the Digital Age.
            </p>
          </div>
          <p className="text-xs text-outline mt-8">
            &copy; {currentYear} InteriorAI Studio.
          </p>
        </div>

        {/* Right Side: Columns */}
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface">
              {section.title}
            </h3>
            <ul className="flex flex-col gap-2.5">
              {section.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.path}
                    className="text-sm text-on-surface-variant hover:text-primary transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
