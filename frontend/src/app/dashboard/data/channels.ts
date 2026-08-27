import { FaInstagram, FaWhatsapp, FaFacebook, FaPhone, FaComments } from "react-icons/fa6";
import type { IconType } from "react-icons";

export type ChannelId = "instagram" | "whatsapp" | "facebook" | "phone" | "web_chat";

export interface ChannelMeta {
  id: ChannelId;
  label: string;
  icon: IconType;
  color: string;
}

// Same brand icons/colors as the marketing site's Omnichannel.tsx — the
// dashboard and marketing site should read as the same product, not two.
export const CHANNELS: Record<ChannelId, ChannelMeta> = {
  instagram: { id: "instagram", label: "Instagram", icon: FaInstagram, color: "#D6336C" },
  whatsapp: { id: "whatsapp", label: "WhatsApp", icon: FaWhatsapp, color: "#25D366" },
  facebook: { id: "facebook", label: "Facebook", icon: FaFacebook, color: "#1877F2" },
  // Phone/web-chat aren't real third-party brands (unlike the platforms
  // above, which keep their actual brand colors for recognizability) — these
  // fold into the site's own primary/secondary pair instead of an arbitrary
  // unrelated hue.
  phone: { id: "phone", label: "Phone", icon: FaPhone, color: "#0B6362" },
  web_chat: { id: "web_chat", label: "Web chat", icon: FaComments, color: "#C9A24B" }
};
