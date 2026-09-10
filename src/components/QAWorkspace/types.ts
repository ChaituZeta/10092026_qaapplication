export interface ExtractedLink {
  id: string;
  moduleName: string;
  linkText: string;
  href: string;
  alt: string;
  alias: string;
  title: string;
  tracking: Record<string, string>;
  utmParams?: Record<string, string>;
  modulePosition: number;
  imageUrl: string | null;
  buttonText: string;
  visibleText: string;
  status: "unchecked" | "passed" | "failed";
  expectedUrl?: string;
  actualUrl?: string;
  finalUrl?: string;
  httpStatus?: number;
  redirectCount?: number;
  loadTime?: number;
  countryMismatch?: boolean;
  countryMismatchReason?: string;
  countryMatchStatus?: "match" | "mismatch" | "neutral";
  statusMessage?: string;
  validationChecked?: boolean;
}
