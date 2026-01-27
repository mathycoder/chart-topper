import sharp from 'sharp';
import type { RangeChartConfig } from './config';

export async function previewCrops(imagePath: string, cfg: RangeChartConfig) {
  const img = sharp(imagePath);
  
  // Get image metadata for auto-detection
  const metadata = await img.metadata();
  const imgWidth = metadata.width || 0;
  const imgHeight = metadata.height || 0;
  
  // If gridBox is at origin with 0 dimensions, use full image
  const useFullImage = cfg.gridBox.x < 20 && cfg.gridBox.y < 20 && (cfg.gridBox.w === 0 || cfg.gridBox.h === 0);
  
  if (useFullImage) {
    // Just copy the full image as the grid preview
    await img.clone().toFile('tmp/preview-grid.png');
    
    // For legend previews, sample from known cells:
    // AA (row 0, col 0) for raise, 99 (row 5, col 5) for call, A2s (row 0, col 12) for fold
    const cellW = Math.floor(imgWidth / 13);
    const cellH = Math.floor(imgHeight / 13);
    
    if (cellW > 0 && cellH > 0) {
      // AA cell for raise
      await img.clone().extract({ left: 0, top: 0, width: cellW, height: cellH })
        .toFile('tmp/preview-legend-raise.png');
      
      // 99 cell for call (row 5, col 5)
      await img.clone().extract({ left: 5 * cellW, top: 5 * cellH, width: cellW, height: cellH })
        .toFile('tmp/preview-legend-call.png');
      
      // A2s cell for fold (row 0, col 12)
      await img.clone().extract({ left: 12 * cellW, top: 0, width: cellW, height: cellH })
        .toFile('tmp/preview-legend-fold.png');
    }
  } else {
    await img.clone().extract({ left: cfg.gridBox.x, top: cfg.gridBox.y, width: cfg.gridBox.w, height: cfg.gridBox.h })
      .toFile('tmp/preview-grid.png');

    await img.clone().extract({ left: cfg.legend.raiseBox.x, top: cfg.legend.raiseBox.y, width: cfg.legend.raiseBox.w, height: cfg.legend.raiseBox.h })
      .toFile('tmp/preview-legend-raise.png');

    await img.clone().extract({ left: cfg.legend.callBox.x, top: cfg.legend.callBox.y, width: cfg.legend.callBox.w, height: cfg.legend.callBox.h })
      .toFile('tmp/preview-legend-call.png');

    await img.clone().extract({ left: cfg.legend.foldBox.x, top: cfg.legend.foldBox.y, width: cfg.legend.foldBox.w, height: cfg.legend.foldBox.h })
      .toFile('tmp/preview-legend-fold.png');
  }
}
