"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Language } from "@/lib/translations";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  className?: string;
}

const languages: { code: Language; flag: string; label: string }[] = [
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" },
];

export function LanguageSwitcher({
  language,
  onLanguageChange,
  className,
}: LanguageSwitcherProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {languages.map((lang) => (
        <Button
          key={lang.code}
          variant={language === lang.code ? "default" : "ghost"}
          size="sm"
          onClick={() => onLanguageChange(lang.code)}
          className={cn(
            "h-9 min-w-[44px] px-2 text-base transition-all",
            language === lang.code
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent"
          )}
          aria-label={lang.label}
          title={lang.label}
        >
          <span className="text-lg">{lang.flag}</span>
        </Button>
      ))}
    </div>
  );
}
