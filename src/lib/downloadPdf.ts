const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 12;
const POWERED_BY = "Powered by Triasoft";

export const toPdfFilename = (name: string): string => {
  const base = name
    .trim()
    .replace(/\.pdf$/i, "")
    .replaceAll("#", "")
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "document"}.pdf`;
};

const applyPoweredByWatermark = (
  pdf: InstanceType<(typeof import("jspdf"))["jsPDF"]>,
  GState: (typeof import("jspdf"))["GState"],
) => {
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.saveGraphicsState();
    pdf.setGState(new GState({ opacity: 0.03 }));
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(36);
    pdf.setTextColor(110);
    pdf.text(POWERED_BY, PAGE_WIDTH_MM / 2, PAGE_HEIGHT_MM / 2, {
      align: "center",
      angle: 32,
    });
    pdf.restoreGraphicsState();
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(POWERED_BY, PAGE_WIDTH_MM / 2, PAGE_HEIGHT_MM - 6, {
      align: "center",
    });
  }
};

export const downloadElementAsPdf = async (
  element: HTMLElement,
  filename: string,
): Promise<void> => {
  const [{ default: html2canvas }, { GState, jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    scale: Math.min(2, window.devicePixelRatio || 2),
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    onclone: (clonedDoc) => {
      clonedDoc
        .querySelectorAll(".order-document__tabs, .order-document__pdf-hide")
        .forEach((node) => node.remove());
      clonedDoc
        .querySelector(".order-document")
        ?.classList.add("is-pdf-export");
    },
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const printableWidth = PAGE_WIDTH_MM - MARGIN_MM * 2;
  const printableHeight = PAGE_HEIGHT_MM - MARGIN_MM * 2;
  const imageHeight = (canvas.height * printableWidth) / canvas.width;
  const imageData = canvas.toDataURL("image/png");

  let remaining = imageHeight;
  let offset = MARGIN_MM;
  pdf.addImage(
    imageData,
    "PNG",
    MARGIN_MM,
    offset,
    printableWidth,
    imageHeight,
  );
  remaining -= printableHeight;

  while (remaining > 0) {
    offset -= printableHeight;
    pdf.addPage();
    pdf.addImage(
      imageData,
      "PNG",
      MARGIN_MM,
      offset,
      printableWidth,
      imageHeight,
    );
    remaining -= printableHeight;
  }

  applyPoweredByWatermark(pdf, GState);
  pdf.save(toPdfFilename(filename));
};
