import type { GalleyImageInfo, GalleyImageMetadataInput } from '../types';

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

export interface ResizeInput {
  corner: ResizeCorner;
  deltaX: number;
  deltaY: number;
  free: boolean;
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

  if (!input.free) {
    const ratio = currentHeight / currentWidth;
    const widthFromHeightDelta = heightDelta / ratio;
    const dominantDelta =
      Math.abs(widthDelta) >= Math.abs(widthFromHeightDelta) ? widthDelta : widthFromHeightDelta;
    const width = clampSize(currentWidth + dominantDelta, minSize);

    return {
      width,
      height: clampSize(width * ratio, minSize),
    };
  }

  return {
    width: clampSize(currentWidth + widthDelta, minSize),
    height: clampSize(currentHeight + heightDelta, minSize),
  };
}

function clampSize(value: number, minSize: number): number {
  return Math.max(minSize, Math.round(value));
}
