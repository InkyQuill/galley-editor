import { describe, expect, it } from 'vitest';
import type { GalleyImageInfo } from '../types';
import { resizeImageMetadata } from './image-resize';

function image(overrides: Partial<GalleyImageInfo> = {}): GalleyImageInfo {
  return {
    alt: 'Diagram',
    url: 'diagram.png',
    raw: '![Diagram](diagram.png)',
    from: 0,
    to: 23,
    ...overrides,
  };
}

describe('resizeImageMetadata', () => {
  it('preserves aspect ratio on southeast resize', () => {
    expect(resizeImageMetadata(image({ width: 640, height: 360 }), {
      corner: 'se',
      deltaX: 160,
      deltaY: 0,
      free: false,
    })).toEqual({ width: 800, height: 450 });
  });

  it('resizes width and height independently for free resize', () => {
    expect(resizeImageMetadata(image({ width: 640, height: 360 }), {
      corner: 'se',
      deltaX: 160,
      deltaY: 40,
      free: true,
    })).toEqual({ width: 800, height: 400 });
  });

  it('inverts deltas for northwest resize', () => {
    expect(resizeImageMetadata(image({ width: 640, height: 360 }), {
      corner: 'nw',
      deltaX: -160,
      deltaY: -90,
      free: false,
    })).toEqual({ width: 800, height: 450 });
  });

  it('clamps dimensions to the minimum size', () => {
    expect(resizeImageMetadata(image({ width: 640, height: 360 }), {
      corner: 'se',
      deltaX: -1000,
      deltaY: -1000,
      free: true,
    })).toEqual({ width: 32, height: 32 });
  });

  it('uses default dimensions when metadata is missing', () => {
    expect(resizeImageMetadata(image(), {
      corner: 'se',
      deltaX: 160,
      deltaY: 0,
      free: false,
    })).toEqual({ width: 480, height: 270 });
  });
});
