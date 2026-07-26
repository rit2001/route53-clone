"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type DialogFrameProps = Readonly<{
  children: ReactNode;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}>;

export function DialogFrame({
  children,
  description,
  open,
  onOpenChange,
  title,
}: DialogFrameProps) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-menu)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-5 text-[var(--muted)]">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close dialog"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--nav-hover)]"
            >
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
