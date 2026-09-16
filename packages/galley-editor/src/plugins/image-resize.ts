import type { GalleyImageInfo, GalleyImageMetadataInput } from '../types';

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

export interface ResizeInput {
  corner: ResizeCorner;
  deltaX: number;
  deltaY: number;
  minSize?: number;
}

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 180;
const DEFAULT_MIN_SIZE = 32;

export function resizeImageMetadata(
  image: GalleyImageInfo,
  input: ResizeInput,
): GalleyImageMetadataInput {
  const minSize = input.minSize ?? DEFAULT_MIN_SIZE;
  const currentWidth = image.width ?? DEFAULT_WIDTH;
  const currentHeight = image.height ?? DEFAULT_HEIGHT;
  const widthDelta = input.corner.endsWith('e') ? input.deltaX : -input.deltaX;
  const heightDelta = input.corner.startsWith('s') ? input.deltaY : -input.deltaY;

  const ratio = currentHeight / currentWidth;
  const widthFromHeightDelta = heightDelta / ratio;
  const dominantDelta =
    Math.abs(widthDelta) >= Math.abs(widthFromHeightDelta) ? widthDelta : widthFromHeightDelta;
  const width = clampAspectWidth(currentWidth + dominantDelta, ratio, minSize);

  return {
    width,
    height: Math.round(width * ratio),
  };
}

function clampAspectWidth(value: number, ratio: number, minSize: number): number {
  const minimumWidth = Math.max(minSize, minSize / ratio);
  return Math.max(Math.round(minimumWidth), Math.round(value));
}
