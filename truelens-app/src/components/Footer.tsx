import Link from "next/link";
import { Shield, Code2, Rss, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border-color" style={{ background: "rgba(9, 9, 11, 0.9)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Shield className="w-7 h-7 text-text-primary" />
              <span className="text-lg font-bold text-text-primary">
                TrueLens
              </span>
            </Link>
            <p className="text-text-muted text-sm leading-relaxed">
              Verifying authenticity in the age of AI. Making the internet more trustworthy, one scan at a time.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="#" className="text-text-muted hover:text-text-primary transition-colors">
                <Code2 className="w-5 h-5" />
              </a>
              <a href="#" className="text-text-muted hover:text-text-primary transition-colors">
                <Rss className="w-5 h-5" />
              </a>
              <a href="#" className="text-text-muted hover:text-text-primary transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Product</h4>
            <ul className="space-y-2.5">
              {[
                { href: "/scan", label: "Scan Content" },
                { href: "/documents", label: "Document Verification" },
                { href: "/developers", label: "API Access" },
                { href: "/verify", label: "Verify Document" },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-text-muted text-sm hover:text-text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2.5">
              {["About", "Blog", "Careers", "Contact"].map(item => (
                <li key={item}>
                  <a href="#" className="text-text-muted text-sm hover:text-text-primary transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2.5">
              {["Privacy Policy", "Terms of Service", "Cookie Policy", "API Terms"].map(item => (
                <li key={item}>
                  <a href="#" className="text-text-muted text-sm hover:text-text-primary transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border-color mt-10 pt-6 pb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-text-muted text-xs">
            © {new Date().getFullYear()} TrueLens. All rights reserved. Built with ❤️ by the TrueLens team.
          </p>
          <p className="text-text-muted text-xs">
            Aryam Agarwal • Priyanshu Agarwal • Hitarth Singh Rajput • Akshat Singh • Piyush Kumar
          </p>
        </div>
      </div>
    </footer>
  );
}
