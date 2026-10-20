export function popupPlacement(anchor, viewport, { maxWidth = 576, maxHeight = 384, panelHeight = maxHeight, margin = 12, gap = 8 } = {}) {
  const width = Math.max(0, Math.min(maxWidth, viewport.width - margin * 2));
  const height = Math.max(0, Math.min(maxHeight, viewport.height - margin * 2));
  const left = Math.max(margin, Math.min(anchor.left, viewport.width - width - margin));
  const above = Math.max(0, anchor.top - gap - margin);
  const below = Math.max(0, viewport.height - anchor.bottom - gap - margin);
  const wantedHeight = Math.min(panelHeight, height);
  if (Math.max(above, below) < Math.min(144, wantedHeight)) {
    return { left, top: margin, width, maxHeight: height };
  }
  const openBelow = below >= wantedHeight || below >= above;
  const available = Math.min(height, openBelow ? below : above);
  return {
    left,
    top: openBelow ? anchor.bottom + gap : anchor.top - gap - Math.min(panelHeight, available),
    width,
    maxHeight: available
  };
}
