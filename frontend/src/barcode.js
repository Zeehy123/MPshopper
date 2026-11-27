// Barcode helpers: tidy the text, check it, scan with the camera, look up a name.

// keep digits only ("5 449000 000996" -> "5449000000996")
export const normalizeBarcode = (text) => String(text ?? "").replace(/\D/g, "");

// Checks the last digit of EAN-8, UPC-A (12), EAN-13 and ITF-14 codes. It catches a
// mistyped digit before a wrong code is saved.
export function isValidGtin(code) {
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop();
  let sum = 0;
  // counting from the right of the body, weights alternate 3, 1, 3, 1...
  digits.reverse().forEach((d, i) => {
    sum += d * (i % 2 === 0 ? 3 : 1);
  });
  return (10 - (sum % 10)) % 10 === check;
}

// Does this browser have the camera barcode reader? (Chrome and Edge do; Safari and
// Firefox do not, so the scanner always offers typing the number as well.)
export const canScan = () =>
  typeof window !== "undefined" &&
  "BarcodeDetector" in window &&
  !!navigator.mediaDevices?.getUserMedia;

export const SCAN_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "itf"];

// Asks Open Food Facts (a free, open product database) what a code is. Needs internet
// and does not know every shop's products; null means "no answer", never an error.
export async function lookupBarcode(code, fetchFn = fetch) {
  try {
    const url =
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json` +
      "?fields=product_name,brands,quantity";
    const res = await fetchFn(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product?.product_name) return null;
    return {
      name: data.product.product_name.trim(),
      brand: (data.product.brands ?? "").split(",")[0].trim(),
      quantity: (data.product.quantity ?? "").trim(),
    };
  } catch {
    return null;
  }
}
