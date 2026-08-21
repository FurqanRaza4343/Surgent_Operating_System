export interface FooterColumn {
  title: string;
  links: string[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
{
  title: "Platform",
  links: ["Front desk agents", "Consultation agents", "Surgery management", "Post-surgery care", "Business & ops"]
},
{
  title: "Company",
  links: ["About", "Customers", "Security", "Careers", "Contact"]
},
{
  title: "Resources",
  links: ["Demo", "Pricing", "Help center", "API docs", "Status"]
}];
