// src/features/contracts/create-contract-action.ts
"use server";

import { createContract } from "@/application/contracts/create-contract";
import { ClientNotFoundError } from "@/domain/client-errors";
import {
  ClientArchivedError,
  InvalidContractInputError,
  InvalidContractPeriodError,
  OverlappingContractError,
} from "@/domain/contract-errors";
import { getAuthenticatedContractContext } from "@/features/contracts/authenticated-contract-context";
import {
  CONTRACT_ARCHIVED_CLIENT_ERROR,
  CONTRACT_CLIENT_NOT_FOUND_ERROR,
  CONTRACT_FIELD_ERROR_MESSAGES,
  CONTRACT_OVERLAP_ERROR,
  CONTRACT_PERIOD_ERROR,
  readContractFormValues,
  toContractCreateInput,
  type ContractFormActionState,
} from "@/features/contracts/contract-form-state";
import { redirect } from "next/navigation";

export async function createContractAction(
  _previousState: ContractFormActionState,
  formData: FormData,
): Promise<ContractFormActionState> {
  const { context, clients, contracts } =
    await getAuthenticatedContractContext();
  const values = readContractFormValues(formData);

  let contractId: string;

  try {
    const contract = await createContract(
      context,
      toContractCreateInput(values),
      clients,
      contracts,
    );
    contractId = contract.id;
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

    if (error instanceof ClientArchivedError) {
      return {
        error: CONTRACT_ARCHIVED_CLIENT_ERROR,
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
      error: "Unable to create the contract.",
      values,
    };
  }

  redirect(`/contracts/${contractId}`);
}
