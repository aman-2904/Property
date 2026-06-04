"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalPortal, ModalOverlay } from "@/components/ui/modal-system";
import { VisitForm } from "@/components/forms/visit-form";
import { useRouter } from "next/navigation";

interface MobileVisitModalProps {
  properties: { id: string; title: string }[];
}

export function MobileVisitModal({ properties }: MobileVisitModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setIsOpen(false);
    // Refresh page data to reflect new logged visit
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/95 flex items-center gap-1.5 text-xs shadow-lg shadow-primary/10 active:scale-[0.98] transition-all"
      >
        <Plus className="h-4 w-4" />
        Log Visit
      </button>

      <Modal open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
        <ModalPortal>
          <ModalOverlay />
          <ModalContent isOpen={isOpen} className="max-w-lg w-[95vw] sm:w-full p-6 max-h-[90vh] overflow-y-auto">
            <ModalHeader className="mb-4">
              <ModalTitle className="text-xl font-bold text-foreground">Log New Visit</ModalTitle>
            </ModalHeader>
            <div className="pt-2">
              <VisitForm properties={properties} onSuccess={handleSuccess} />
            </div>
          </ModalContent>
        </ModalPortal>
      </Modal>
    </>
  );
}
