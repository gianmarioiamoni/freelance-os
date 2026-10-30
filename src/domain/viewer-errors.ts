// src/domain/viewer-errors.ts
export type ViewerInputField =
  | "email"
  | "tokenExpiry"
  | "message"
  | "displayLabel"
  | "contractId"
  | "viewerAccessId";

export class InvalidViewerInputError extends Error {
  readonly field: ViewerInputField;

  constructor(field: ViewerInputField) {
    super("Invalid viewer input");
    this.name = "InvalidViewerInputError";
    this.field = field;
  }
}

export class ViewerAccessNotFoundError extends Error {
  constructor() {
    super("Viewer access not found");
    this.name = "ViewerAccessNotFoundError";
  }
}

export class ViewerTokenExpiredError extends Error {
  constructor() {
    super("Viewer token expired");
    this.name = "ViewerTokenExpiredError";
  }
}

export class ViewerTokenNotFoundError extends Error {
  constructor() {
    super("Viewer token not found");
    this.name = "ViewerTokenNotFoundError";
  }
}

export class ViewerTokenAlreadyAcceptedError extends Error {
  constructor() {
    super("Viewer token already accepted");
    this.name = "ViewerTokenAlreadyAcceptedError";
  }
}

export class InvalidViewerStatusTransitionError extends Error {
  constructor(
    public readonly fromStatus: string,
    public readonly toStatus: string,
  ) {
    super(`Invalid viewer status transition from ${fromStatus} to ${toStatus}`);
    this.name = "InvalidViewerStatusTransitionError";
  }
}

export class AnomalyReportNotFoundError extends Error {
  constructor() {
    super("Anomaly report not found");
    this.name = "AnomalyReportNotFoundError";
  }
}

export class ViewerUnauthorizedError extends Error {
  constructor() {
    super("Viewer unauthorized for requested resource");
    this.name = "ViewerUnauthorizedError";
  }
}
