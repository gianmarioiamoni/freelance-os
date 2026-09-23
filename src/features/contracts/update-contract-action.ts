// src/features/contracts/update-contract-action.ts
"use server";

import { updateContract } from "@/application/contracts/update-contract";
import { ClientNotFoundError } from "@/domain/client-errors";
import {
  ContractCurrencyImmutableError,
  ContractNotFoundError,
  InvalidContractInputError,
  InvalidContractPeriodError,
  OverlappingContractError,
} from "@/domain/contract-errors";
import { triggerAllocationAlertEvaluation } from "@/application/alerts/trigger-allocation-alert-evaluation";
import { getAuthenticatedContractContext } from "@/features/contracts/authenticated-contract-context";
import {
  CONTRACT_CLIENT_NOT_FOUND_ERROR,
  CONTRACT_CURRENCY_IMMUTABLE_ERROR,
  CONTRACT_FIELD_ERROR_MESSAGES,
  CONTRACT_NOT_FOUND_ERROR,
  CONTRACT_OVERLAP_ERROR,
  CONTRACT_PERIOD_ERROR,
  readContractFormValues,
  toContractUpdateInput,
  type ContractFormActionState,
} from "@/features/contracts/contract-form-state";
import { redirect } from "next/navigation";

export async function updateContractAction(
  contractId: string,
  _previousState: ContractFormActionState,
  formData: FormData,
): Promise<ContractFormActionState> {
  const { context, runInTransaction } = await getAuthenticatedContractContext();
  const values = readContractFormValues(formData);

  try {
    await updateContract(
      context,
      contractId,
      toContractUpdateInput(values),
      runInTransaction,
    );

    await triggerAllocationAlertEvaluation(context, contractId, runInTransaction);
  } catch (error) {
    if (error instanceof InvalidContractInputError) {
      return {
        error: CONTRACT_FIELD_ERROR_MESSAGES[error.field],
        field: error.field,
        values,
      };
    }

    if (error instanceof InvalidContractPeriodError) {
      return {
        error: CONTRACT_PERIOD_ERROR,
        field: "validTo",
        values,
      };
    }

    if (error instanceof OverlappingContractError) {
      return {
        error: CONTRACT_OVERLAP_ERROR,
        values,
      };
    }

    if (error instanceof ContractCurrencyImmutableError) {
      return {
        error: CONTRACT_CURRENCY_IMMUTABLE_ERROR,
        field: "currency",
        values,
      };
    }

    if (error instanceof ContractNotFoundError) {
      return {
        error: CONTRACT_NOT_FOUND_ERROR,
        values,
      };
    }

    if (error instanceof ClientNotFoundError) {
      return {
        error: CONTRACT_CLIENT_NOT_FOUND_ERROR,
        values,
      };
    }

    return {
      error: "Unable to update the contract.",
      values,
    };
  }

  redirect(`/contracts/${contractId}`);
}
