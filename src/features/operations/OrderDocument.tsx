import { useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui";
import { downloadElementAsPdf } from "../../lib/downloadPdf";

export const OrderDocument = ({
  filename,
  children,
}: {
  filename: string;
  children: ReactNode;
}) => (
  <div className="order-document-wrap">
    <article className="order-document" data-pdf-filename={filename}>
      {children}
    </article>
  </div>
);

export const OrderDocumentBrand = ({
  documentTitle,
}: {
  documentTitle: string;
}) => (
  <div className="order-document__brand">
    <span className="brand-mark brand-mark--small">
      <img src="/logo.png" alt="" width={39} height={39} />
    </span>
    <div>
      <strong>Garage</strong>
      <p className="order-document__kicker">{documentTitle}</p>
    </div>
  </div>
);

export const DownloadDocumentButton = () => {
  const [loading, setLoading] = useState(false);

  const downloadPdf = async () => {
    const target = document.querySelector(".order-document");
    if (!(target instanceof HTMLElement)) return;
    const filename = target.dataset.pdfFilename ?? "document";
    setLoading(true);
    try {
      await downloadElementAsPdf(target, filename);
    } catch {
      toast.error("Unable to download the PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      loading={loading}
      onClick={() => void downloadPdf()}
    >
      <Download size={16} /> Download
    </Button>
  );
};
