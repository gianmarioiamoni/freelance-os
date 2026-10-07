// src/features/reporting/report-excel-download.ts

const DEFAULT_FILENAME = "reports.xlsx";

/**
 * Triggers a browser download for the report XLSX at `href`.
 * Relies on same-origin cookies for workspace auth; does not send workspaceId.
 */
export async function downloadReportExcel(href: string): Promise<void> {
  const response = await fetch(href, {
    method: "GET",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Unable to export Excel report");
  }

  const blob = await response.blob();
  const filename =
    filenameFromContentDisposition(response.headers.get("Content-Disposition")) ??
    DEFAULT_FILENAME;

  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function filenameFromContentDisposition(
  header: string | null,
): string | null {
  if (!header) {
    return null;
  }
  const match = /filename="([^"]+)"/i.exec(header);
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? value : null;
}
