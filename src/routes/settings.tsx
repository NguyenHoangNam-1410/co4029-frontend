import { Link } from "@tanstack/react-router";
import { Bell, ChevronRight, Shield, User } from "lucide-react";
import { useTranslation } from "react-i18next";

interface HubCard {
  to: "/settings/profile" | "/settings/security" | "/settings/notifications";
  icon: typeof User;
  titleKey: string;
  bodyKey: string;
}

const CARDS: HubCard[] = [
  {
    to: "/settings/profile",
    icon: User,
    titleKey: "settings_hub.cards.profile_title",
    bodyKey: "settings_hub.cards.profile_body",
  },
  {
    to: "/settings/security",
    icon: Shield,
    titleKey: "settings_hub.cards.security_title",
    bodyKey: "settings_hub.cards.security_body",
  },
  {
    to: "/settings/notifications",
    icon: Bell,
    titleKey: "settings_hub.cards.notifications_title",
    bodyKey: "settings_hub.cards.notifications_body",
  },
];

export default function SettingsHubPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6 pb-12">
      <header>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-m3-on-surface">
          {t("settings_hub.title")}
        </h1>
        <p className="mt-2 text-sm font-medium text-m3-on-surface-variant">
          {t("settings_hub.subtitle")}
        </p>
      </header>

      <div className="space-y-3">
        {CARDS.map(({ to, icon: Icon, titleKey, bodyKey }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-4 rounded-xl bg-white border border-m3-outline-variant/40 p-5 hover:border-m3-primary/40 hover:shadow-sm transition-all duration-150"
          >
            <div className="w-11 h-11 rounded-xl bg-m3-primary-fixed flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-m3-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-headline font-bold text-text-strong">
                {t(titleKey)}
              </p>
              <p className="text-sm text-text-muted mt-0.5">{t(bodyKey)}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-text-muted group-hover:text-m3-primary transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
