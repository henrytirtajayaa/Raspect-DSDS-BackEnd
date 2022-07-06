import {getImageFromS3, storeImageToS3} from "./s3-image-utils.mjs";
import sharp from "sharp";
import path from 'path';

// All operation return the transformation matrix from target to original coordinate from (x, y, 1)
export async function generateResponsiveImages(photo, specs) {
    const { filename } = photo;
    const dirname = path.dirname(filename);
    const ext = path.extname(filename);
    const basename = path.basename(filename, ext);
    const buffer = await getImageFromS3(filename);
    const image = await sharp(buffer);
    const meta = await image.metadata();
    const result = {};
    for (const spec of specs) {
        const height = Math.round(spec.width / meta.width * meta.height);
        const bufferResized = await sharp(buffer).resize(spec.width, height, {
            kernel: sharp.kernel.lanczos3,
            fit: 'contain'
        }).toBuffer();
        const resizedFilepath = `${dirname}/${basename}_${spec.suffix}${ext}`;
        await storeImageToS3(resizedFilepath, bufferResized);
        const scale = spec.width/ meta.width;
        result[spec.scalePropertyName] = [[scale, 0], [0, scale], [0, 0]];
        result[spec.filePropertyName] = resizedFilepath;
    }
    return result;
}

export async function generateCropImage(photo, x1, y1, x2, y2, cropRatio) {
    const { filename } = photo;
    const dirname = path.dirname(filename);
    const ext = path.extname(filename);
    const basename = path.basename(filename, ext);
    const buffer = await getImageFromS3(filename);
    const meta = await sharp(buffer).metadata();
    const coordinateTransformParams = {
        x: 0,
        y: 0,
    };
    // Calculate Crop box fitting cropRatio
    const width = x2 - x1;
    const height = y2 - y1;
    const boundWidth = Math.round(height * cropRatio.width / cropRatio.height);
    const boundHeight = Math.round(width * cropRatio.height / cropRatio.width);
    const cropWidth = Math.max(width, boundWidth);
    const cropHeight = Math.max(height, boundHeight);
    // Recalculate corner location
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const cropOption = {
        left: Math.round(centerX - cropWidth / 2),
        top: Math.round(centerY - cropHeight / 2),
        width: cropWidth,
        height: cropHeight,
    }
    // Image Out Bound Check
    const overShootLeft = 0 - cropOption.left;
    const overShootTop = 0 - cropOption.top;
    const overShootRight = cropOption.left + cropOption.width - meta.width;
    const overShootBottom = cropOption.top + cropOption.height - meta.height;
    const extendOptions = {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        background: { r: 0, g: 0, b: 0, alpha: 0.8 },
    };
    // Adjust horizontal rectangle
    if (overShootLeft > 0 && overShootRight + overShootLeft < 0) {
        cropOption.left += overShootLeft;
    } else if (overShootRight > 0 && overShootLeft + overShootRight < 0) {
        cropOption.left -= overShootRight;
    } else if (overShootLeft + overShootRight > 0) {
        const overShootSpread = Math.round((overShootLeft + overShootRight) / 2);
        extendOptions.left = overShootSpread;
        extendOptions.right = overShootSpread;
        cropOption.left = 0
        cropOption.width = meta.width;
    }
    // Adjust vertical rectangle
    if (overShootTop > 0 && overShootBottom + overShootTop < 0) {
        cropOption.top += overShootTop;
    } else if (overShootBottom > 0 && overShootTop + overShootBottom < 0) {
        cropOption.top -= overShootBottom;
    } else if (overShootTop + overShootBottom > 0) {
        const overShootSpread = Math.round((overShootTop + overShootBottom) / 2);
        extendOptions.top = overShootSpread;
        extendOptions.bottom = overShootSpread;
        cropOption.top = 0
        cropOption.height = meta.height;
    }
    coordinateTransformParams.x = -cropOption.left + extendOptions.left;
    coordinateTransformParams.y = -cropOption.top + extendOptions.top;
    // Apply Adjustment
    const bufferResized = await sharp(buffer).extract(cropOption).extend(extendOptions).toBuffer();
    await storeImageToS3(`${dirname}/${basename}_c${x1}-${y1}-${x2}-${y2}${ext}`, bufferResized);
    return [[1, 0], [0, 1], [-coordinateTransformParams.x, -coordinateTransformParams.y]];
}