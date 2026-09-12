// src/components/forms/field-association.ts

export type FieldAssociationOptions = {
  hint?: string;
  error?: string;
};

export type FieldControlAssociation = {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
};

export function getFieldHintId(controlId: string): string {
  return `${controlId}-hint`;
}

export function getFieldErrorId(controlId: string): string {
  return `${controlId}-error`;
}

export function getFieldDescribedBy(
  controlId: string,
  options: FieldAssociationOptions,
): string | undefined {
  const ids: string[] = [];

  if (options.hint) {
    ids.push(getFieldHintId(controlId));
  }

  if (options.error) {
    ids.push(getFieldErrorId(controlId));
  }

  if (ids.length === 0) {
    return undefined;
  }

  return ids.join(" ");
}

export function getFieldControlAssociation(
  controlId: string,
  options: FieldAssociationOptions,
): FieldControlAssociation {
  return {
    id: controlId,
    "aria-invalid": options.error ? true : undefined,
    "aria-describedby": getFieldDescribedBy(controlId, options),
  };
}
