"use client";

import React from "react";
import { Dialog } from "@/components/ui/Dialog";
import type { RepoOverviewView } from "@/contracts";
import { RepoOverview } from "./RepoOverview";

export interface RepoOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  overview?: RepoOverviewView | null;
}

/**
 * Cửa sổ Tổng quan kiến trúc repository (D-71, D-83, Việc 6).
 */
export function RepoOverviewModal({
  isOpen,
  onClose,
}: RepoOverviewModalProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title="Tổng quan"
      description="Bức tranh chung về repository"
    >
      <div className="pt-2">
        <RepoOverview onStart={onClose} />
      </div>
    </Dialog>
  );
}
