"use client";
import { useState } from "react";
import { Menu, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import { ThemeSwitch } from "@/components/arc/theme-switch/theme-switch";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/arc/drawer/drawer";
import { useTheme } from "./theme-provider";
const links = [
  { href: "#about", label: "About" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];
export function Navigation() {
  const { choice, setChoice } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="nav-container">
        <a className="brand" href="#converter" aria-label="Site2NextJS home">
          <span className="brand-mark">
            S<span>2</span>N
          </span>
          <span>Site2NextJS</span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
          <a
            href="https://github.com/eueer/Site2NextJS"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
            <ArrowUpRight size={14} />
          </a>
        </nav>
        <div className="nav-actions">
          <div className="theme-control">
            <ThemeSwitch theme={choice} onThemeChange={setChoice} iconOnly />
          </div>
          <div className="mobile-nav">
            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerTrigger asChild>
                <Button variant="secondary" aria-label="Open navigation">
                  <Menu size={18} />
                </Button>
              </DrawerTrigger>
              <DrawerContent title="Navigation">
                <nav className="drawer-links" aria-label="Mobile navigation">
                  {links.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                    >
                      {l.label}
                    </a>
                  ))}
                  <a
                    href="https://github.com/eueer/Site2NextJS"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub
                  </a>
                </nav>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </div>
    </header>
  );
}
