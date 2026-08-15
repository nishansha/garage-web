const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 12;

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

export const downloadElementAsPdf = async (
  element: HTMLElement,
  filename: string,
): Promise<void> => {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
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

  pdf.save(toPdfFilename(filename));
};
