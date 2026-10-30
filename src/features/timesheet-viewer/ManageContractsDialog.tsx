// src/features/timesheet-viewer/ManageContractsDialog.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  authorizeContractAction,
  revokeContractAccessAction,
} from "@/features/timesheet-viewer/timesheet-viewer-actions";
import { useState, type JSX } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Contract = {
  id: string;
  reference: string | null;
  clientName: string;
};

type AuthorizedContract = {
  contractId: string;
  displayLabel: string | null;
};

type ManageContractsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewerAccessId: string;
  viewerEmail: string;
  contracts: Contract[];
  authorizedContracts: AuthorizedContract[];
};

export function ManageContractsDialog({
  open,
  onOpenChange,
  viewerAccessId,
  viewerEmail,
  contracts,
  authorizedContracts,
}: ManageContractsDialogProps): JSX.Element {
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [displayLabel, setDisplayLabel] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const authorizedIds = new Set(
    authorizedContracts.map((c) => c.contractId),
  );
  const availableContracts = contracts.filter(
    (c) => !authorizedIds.has(c.id),
  );

  async function handleAuthorize() {
    if (!selectedContractId) return;

    setIsAdding(true);
    await authorizeContractAction(
      viewerAccessId,
      selectedContractId,
      displayLabel || undefined,
    );
    setIsAdding(false);
    setSelectedContractId("");
    setDisplayLabel("");
  }

  async function handleRevoke(contractId: string) {
    setRevokingId(contractId);
    await revokeContractAccessAction(viewerAccessId, contractId);
    setRevokingId(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Contracts for {viewerEmail}</DialogTitle>
          <DialogDescription>
            Authorize or revoke contract access for this viewer.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          <div className="grid gap-4">
            <h3 className="text-sm font-medium">Authorized Contracts</h3>
            {authorizedContracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No contracts authorized yet.
              </p>
            ) : (
              <div className="grid gap-2">
                {authorizedContracts.map((auth) => {
                  const contract = contracts.find(
                    (c) => c.id === auth.contractId,
                  );
                  return (
                    <div
                      key={auth.contractId}
                      className="flex items-center justify-between border rounded p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {auth.displayLabel ||
                            contract?.reference ||
                            "Unnamed Contract"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contract?.clientName}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={revokingId === auth.contractId}
                        onClick={() => handleRevoke(auth.contractId)}
                      >
                        {revokingId === auth.contractId
                          ? "Revoking…"
                          : "Revoke"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <h3 className="text-sm font-medium">Authorize New Contract</h3>
            {availableContracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All contracts have been authorized.
              </p>
            ) : (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="contract">Contract</Label>
                  <Select
                    value={selectedContractId}
                    onValueChange={setSelectedContractId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a contract" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableContracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.reference || "Unnamed"} -{" "}
                          {contract.clientName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="displayLabel">
                    Display Label (optional)
                  </Label>
                  <Input
                    id="displayLabel"
                    value={displayLabel}
                    onChange={(e) => setDisplayLabel(e.target.value)}
                    placeholder="Q1 Project, etc."
                    maxLength={255}
                  />
                </div>

                <Button
                  onClick={handleAuthorize}
                  disabled={!selectedContractId || isAdding}
                >
                  {isAdding ? "Authorizing…" : "Authorize Contract"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
