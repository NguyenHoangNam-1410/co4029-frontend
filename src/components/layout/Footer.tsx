import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Footer() {
  return (
    <footer className="bg-m3-surface py-20 border-t border-m3-outline-variant/10">
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-1">
          <span className="text-2xl font-bold tracking-tighter text-m3-primary font-headline mb-6 block">
            aBridgeAI
          </span>
          <p className="text-sm text-m3-on-surface-variant leading-relaxed">
            Personalizing education through the synergy of artificial intelligence and human curiosity.
          </p>
        </div>
        <div>
          <h4 className="font-bold text-m3-primary mb-6">Platform</h4>
          <ul className="space-y-4 text-sm text-m3-on-surface-variant">
            <li>
              <Link to="/courses" className="hover:text-m3-secondary transition-colors">
                Course Library
              </Link>
            </li>
            <li>
              <a href="#" className="hover:text-m3-secondary transition-colors">Learning Paths</a>
            </li>
            <li>
              <a href="#" className="hover:text-m3-secondary transition-colors">AI Assistant</a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-m3-primary mb-6">Support</h4>
          <ul className="space-y-4 text-sm text-m3-on-surface-variant">
            <li>
              <a href="#" className="hover:text-m3-secondary transition-colors">Become an Instructor</a>
            </li>
            <li>
              <a href="#" className="hover:text-m3-secondary transition-colors">Help Center</a>
            </li>
            <li>
              <a href="#" className="hover:text-m3-secondary transition-colors">Contact Us</a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-m3-primary mb-6">Newsletter</h4>
          <p className="text-sm text-m3-on-surface-variant mb-6">
            Get the latest AI learning insights.
          </p>
          <div className="flex gap-2">
            <Input
              className="flex-1 bg-m3-surface-container border-none rounded-xl text-sm"
              placeholder="Email"
              type="email"
            />
            <Button className="p-3 bg-m3-primary text-white rounded-xl hover:bg-m3-secondary transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-8 mt-20 pt-8 border-t border-m3-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-xs text-m3-on-surface-variant">
          &copy; 2025 aBridgeAI Learning Systems. All rights reserved.
        </div>
        <div className="flex gap-8 text-xs font-medium text-m3-primary">
          <a className="hover:underline" href="#">Privacy Policy</a>
          <a className="hover:underline" href="#">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
