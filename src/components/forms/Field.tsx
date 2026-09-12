// src/components/forms/Field.tsx
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  cloneElement,
  isValidElement,
  type JSX,
  type ReactElement,
  type ReactNode,
} from "react";

import {
  getFieldControlAssociation,
  getFieldErrorId,
  getFieldHintId,
  type FieldControlAssociation,
} from "./field-association";

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: FieldProps): JSX.Element {
  const association = getFieldControlAssociation(htmlFor, { hint, error });
  const hintId = hint ? getFieldHintId(htmlFor) : undefined;
  const errorId = error ? getFieldErrorId(htmlFor) : undefined;
  const control = isValidElement(children)
    ? cloneElement(
        children as ReactElement<FieldControlAssociation>,
        association,
      )
    : children;

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {control}
      {hint ? (
        <p id={hintId} className="muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
