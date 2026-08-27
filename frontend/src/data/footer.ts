export interface FooterLink {
  label: string;
  // Internal route (react-router `<Link to>`) vs. a same-page/cross-page
  // anchor (plain `<a href>`, e.g. "/#pricing") — every entry below resolves
  // to a real destination on the site, no placeholder links.
  to?: string;
  href?: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
{
  title: "Platform",
  links: [
  { label: "Front desk agents", to: "/agents?category=front-desk" },
  { label: "Consultation agents", to: "/agents?category=consultation" },
  { label: "Surgery management", to: "/agents?category=surgery" },
  { label: "Post-surgery care", to: "/agents?category=post-care" },
  { label: "Business & ops", to: "/agents?category=business" }]

},
{
  title: "Explore",
  links: [
  { label: "All agents", to: "/agents" },
  { label: "Channels", to: "/channels" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Security", href: "/#security" }]

}];
