function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*);base64/);
  const mime = mimeMatch?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function captureSourceFrame(sourceId: string): Promise<Blob | null> {
  const dataUrl = await window.taAPI?.getSourceFrame(sourceId);
  if (!dataUrl) return null;
  return dataUrlToBlob(dataUrl);
}
