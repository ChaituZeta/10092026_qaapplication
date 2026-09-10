import { supabase } from "@/lib/supabase";
import { ValidationResult } from "@/lib/qa-validator";

export interface UrlValidationSummary {
  allowedPattern: string | null;
  countryName: string;
  versionName?: string;
  resolvedViewOnlineUrl: string;
  viewOnlineResult: {
    status: "pass" | "fail" | "warning";
    message: string;
    isPlaceholder: boolean;
  };
  htmlUrlsResult: {
    status: "pass" | "fail" | "warning";
    message: string;
    checkedCount: number;
    invalidUrls: string[];
  };
  validationResults: ValidationResult[];
}

/**
 * Fetches the allowed URL pattern for a selected country and version from the database (Supabase),
 * with fallback to LocalStorage.
 */
export async function fetchAllowedUrlPattern(
  countryName: string,
  versionName?: string
): Promise<string | null> {
  if (!countryName) return null;

  try {
    let query = supabase
      .from("countries")
      .select("url, name, code")
      .ilike("name", countryName.trim());

    if (versionName) {
      query = query.ilike("code", versionName.trim());
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      // Find exact or best match
      const exactMatch = data.find(
        (c) =>
          c.name?.toLowerCase() === countryName.toLowerCase() &&
          (!versionName || c.code?.toLowerCase() === versionName.toLowerCase())
      );
      const matched = exactMatch || data[0];
      if (matched?.url) {
        return matched.url.trim();
      }
    }
  } catch (err) {
    console.error("[UrlValidator] Error fetching URL pattern from database:", err);
  }

  // Server API fallback
  try {
    const res = await fetch("/api/countries");
    if (res.ok) {
      const json = await res.json();
      if (json.countries && Array.isArray(json.countries)) {
        const found = json.countries.find(
          (c: any) =>
            c.name?.toLowerCase() === countryName.toLowerCase() &&
            (!versionName || c.code?.toLowerCase() === versionName.toLowerCase())
        );
        if (found?.url) {
          return found.url.trim();
        }
      }
    }
  } catch (apiErr) {}

  return null;
}

/**
 * Validates the ViewOnline URL against the allowed URL pattern for a country.
 */
export function validateViewOnlineUrl(
  rawWebViewUrl: string,
  allowedPattern: string | null,
  countryInfo: string
): {
  result: ValidationResult;
  resolvedUrl: string;
  isPlaceholder: boolean;
} {
  const trimmedWebUrl = (rawWebViewUrl || "").trim();
  const isPlaceholder =
    !trimmedWebUrl ||
    trimmedWebUrl === "{{ViewOnline}}" ||
    trimmedWebUrl.toLowerCase().includes("{{viewonline}}") ||
    trimmedWebUrl.toLowerCase().includes("%%view_email_url%%") ||
    trimmedWebUrl.toLowerCase().includes("%2b%2bviewonline%2b%2b");

  if (isPlaceholder) {
    if (allowedPattern) {
      return {
        result: {
          id: "viewonline_url",
          name: "View Online URL Matching",
          status: "pass",
          message: `Placeholder {{ViewOnline}} dynamically resolves to allowed database URL pattern '${allowedPattern}' for ${countryInfo}.`,
        },
        resolvedUrl: allowedPattern,
        isPlaceholder: true,
      };
    } else {
      return {
        result: {
          id: "viewonline_url",
          name: "View Online URL Matching",
          status: "fail",
          message: `No URL pattern configured in database for ${countryInfo}. Please add a country pattern in Settings.`,
        },
        resolvedUrl: "",
        isPlaceholder: true,
      };
    }
  }

  const isMirrorHost = /view\.(?:[a-zA-Z0-9-]+\.)*hpnews\.hp\.com|view\.email\.hp\.com|view\.hp\.com/i.test(
    trimmedWebUrl
  );
  const matchesPrefix =
    allowedPattern &&
    trimmedWebUrl.toLowerCase().startsWith(allowedPattern.toLowerCase());

  if (matchesPrefix) {
    return {
      result: {
        id: "viewonline_url",
        name: "View Online URL Matching",
        status: "pass",
        message: `View Online URL matches the allowed database prefix '${allowedPattern}' for ${countryInfo}.`,
      },
      resolvedUrl: trimmedWebUrl,
      isPlaceholder: false,
    };
  } else if (isMirrorHost) {
    return {
      result: {
        id: "viewonline_url",
        name: "View Online URL Matching",
        status: "pass",
        message: `SFMC View Online mirror link verified (${trimmedWebUrl}). Content links cross-referenced against allowed pattern '${allowedPattern || "N/A"}' for ${countryInfo}.`,
      },
      resolvedUrl: trimmedWebUrl,
      isPlaceholder: false,
    };
  } else if (allowedPattern) {
    return {
      result: {
        id: "viewonline_url",
        name: "View Online URL Matching",
        status: "warning",
        message: `View Online URL (${trimmedWebUrl}) differs from standard country pattern '${allowedPattern}' for ${countryInfo}. Ensure this custom domain is intentional.`,
      },
      resolvedUrl: trimmedWebUrl,
      isPlaceholder: false,
    };
  }

  return {
    result: {
      id: "viewonline_url",
      name: "View Online URL Matching",
      status: "fail",
      message: `Invalid or unverified View Online URL '${trimmedWebUrl}' and no pattern configured for ${countryInfo}.`,
    },
    resolvedUrl: trimmedWebUrl,
    isPlaceholder: false,
  };
}

/**
 * Validates all HTML content shop URLs against the allowed URL pattern for a country.
 */
export function validateHtmlContentUrls(
  html: string,
  allowedPattern: string | null,
  countryInfo: string
): {
  result: ValidationResult;
  checkedCount: number;
  invalidUrls: string[];
} {
  if (!html) {
    return {
      result: {
        id: "url_region",
        name: "Promo Pages URL Matching",
        status: "warning",
        message: "No HTML content provided to validate URLs.",
      },
      checkedCount: 0,
      invalidUrls: [],
    };
  }

  const urlRegex = /href=["'](https?:\/\/(?:[a-zA-Z0-9-]+\.)*hp\.com\/[^"']+)["']/gi;
  let match;
  let checkedCount = 0;
  const invalidUrls: string[] = [];

  while ((match = urlRegex.exec(html)) !== null) {
    const url = match[1];
    if (url.toLowerCase().includes("/shop/")) {
      checkedCount++;
      if (
        allowedPattern &&
        !url.toLowerCase().startsWith(allowedPattern.toLowerCase())
      ) {
        if (!invalidUrls.includes(url)) {
          invalidUrls.push(url);
        }
      }
    }
  }

  if (!allowedPattern) {
    return {
      result: {
        id: "url_region",
        name: "Promo Pages URL Matching",
        status: "fail",
        message: `No URL pattern configured in database for ${countryInfo} to validate ${checkedCount} HTML shop links.`,
      },
      checkedCount,
      invalidUrls,
    };
  }

  if (checkedCount === 0) {
    return {
      result: {
        id: "url_region",
        name: "Promo Pages URL Matching",
        status: "warning",
        message: `No HP shop URLs (/shop/) detected in the HTML content for ${countryInfo}.`,
      },
      checkedCount: 0,
      invalidUrls: [],
    };
  }

  if (invalidUrls.length === 0) {
    return {
      result: {
        id: "url_region",
        name: "Promo Pages URL Matching",
        status: "pass",
        message: `All ${checkedCount} HP shop URL(s) in HTML content match the allowed country pattern '${allowedPattern}' for ${countryInfo}.`,
      },
      checkedCount,
      invalidUrls: [],
    };
  }

  return {
    result: {
      id: "url_region",
      name: "Promo Pages URL Matching",
      status: "fail",
      message: `Found ${invalidUrls.length} mismatched HP shop URL(s) in HTML content. Allowed pattern: '${allowedPattern}' for ${countryInfo}. Example mismatch: ${invalidUrls[0]}`,
    },
    checkedCount,
    invalidUrls,
  };
}

/**
 * Reusable utility function that fetches the allowed URL pattern for a selected country from the database
 * and validates both the ViewOnline and HTML content URLs against it.
 */
export async function fetchAndValidateCountryUrls(params: {
  html: string;
  rawWebViewUrl: string;
  countryName: string;
  versionName?: string;
  allowedPattern?: string | null;
}): Promise<UrlValidationSummary> {
  const { html, rawWebViewUrl, countryName, versionName } = params;

  console.log("=================================================");
  console.log("[UrlValidator] START fetchAndValidateCountryUrls");
  console.log(`[UrlValidator] Inputs -> Country: "${countryName}", Version: "${versionName || "N/A"}"`);
  console.log(`[UrlValidator] Inputs -> rawWebViewUrl: "${rawWebViewUrl}"`);
  console.log(`[UrlValidator] Inputs -> HTML Length: ${html ? html.length : 0} characters`);

  // 1. Fetch allowed URL pattern from database if not passed
  let pattern = params.allowedPattern;
  if (pattern === undefined || pattern === null || pattern === "") {
    console.log("[UrlValidator] No allowedPattern passed, fetching from database / local storage...");
    pattern = await fetchAllowedUrlPattern(countryName, versionName);
  }

  console.log(`[UrlValidator] Fetched Database Pattern: "${pattern || "NONE_CONFIGURED"}"`);

  const countryInfo = countryName
    ? `${countryName}${versionName ? ` (${versionName})` : ""}`
    : "selected country";

  // 2. Validate ViewOnline URL against allowed pattern
  const viewOnlineValidation = validateViewOnlineUrl(rawWebViewUrl, pattern, countryInfo);
  console.log("[UrlValidator] ViewOnline Validation Result:", {
    status: viewOnlineValidation.result.status,
    message: viewOnlineValidation.result.message,
    resolvedUrl: viewOnlineValidation.resolvedUrl,
    isPlaceholder: viewOnlineValidation.isPlaceholder
  });

  // 3. Resolve HTML placeholders with resolved ViewOnline URL
  let processedHtml = html || "";
  if (viewOnlineValidation.resolvedUrl) {
    processedHtml = processedHtml
      .replace(/\{\{ViewOnline\}\}/g, viewOnlineValidation.resolvedUrl)
      .replace(/%2B%2BViewOnline%2B%2B/gi, viewOnlineValidation.resolvedUrl)
      .replace(/%%view_email_url%%/gi, viewOnlineValidation.resolvedUrl);
  }

  // 4. Validate HTML Content URLs against allowed pattern
  const htmlUrlsValidation = validateHtmlContentUrls(processedHtml, pattern, countryInfo);
  console.log("[UrlValidator] HTML Content URLs Validation Result:", {
    status: htmlUrlsValidation.result.status,
    message: htmlUrlsValidation.result.message,
    checkedCount: htmlUrlsValidation.checkedCount,
    invalidUrlsCount: htmlUrlsValidation.invalidUrls.length,
    invalidUrls: htmlUrlsValidation.invalidUrls
  });

  console.log("[UrlValidator] END fetchAndValidateCountryUrls Summary Status:", {
    overallAllowedPattern: pattern,
    viewOnlineStatus: viewOnlineValidation.result.status,
    htmlUrlsStatus: htmlUrlsValidation.result.status
  });
  console.log("=================================================");

  return {
    allowedPattern: pattern,
    countryName,
    versionName,
    resolvedViewOnlineUrl: viewOnlineValidation.resolvedUrl,
    viewOnlineResult: {
      status: viewOnlineValidation.result.status as any,
      message: viewOnlineValidation.result.message || "",
      isPlaceholder: viewOnlineValidation.isPlaceholder,
    },
    htmlUrlsResult: {
      status: htmlUrlsValidation.result.status as any,
      message: htmlUrlsValidation.result.message || "",
      checkedCount: htmlUrlsValidation.checkedCount,
      invalidUrls: htmlUrlsValidation.invalidUrls,
    },
    validationResults: [viewOnlineValidation.result, htmlUrlsValidation.result],
  };
}
