import sharp from 'sharp';
import type { RangeChartConfig } from './config';

export async function previewCrops(imagePath: string, cfg: RangeChartConfig) {
  const img = sharp(imagePath);
  await img.clone().extract({ left: cfg.gridBox.x, top: cfg.gridBox.y, width: cfg.gridBox.w, height: cfg.gridBox.h })
    .toFile('tmp/preview-grid.png');

  await img.clone().extract({ left: cfg.legend.raiseBox.x, top: cfg.legend.raiseBox.y, width: cfg.legend.raiseBox.w, height: cfg.legend.raiseBox.h })
    .toFile('tmp/preview-legend-raise.png');

  await img.clone().extract({ left: cfg.legend.callBox.x, top: cfg.legend.callBox.y, width: cfg.legend.callBox.w, height: cfg.legend.callBox.h })
    .toFile('tmp/preview-legend-call.png');

  await img.clone().extract({ left: cfg.legend.foldBox.x, top: cfg.legend.foldBox.y, width: cfg.legend.foldBox.w, height: cfg.legend.foldBox.h })
    .toFile('tmp/preview-legend-fold.png');
}
