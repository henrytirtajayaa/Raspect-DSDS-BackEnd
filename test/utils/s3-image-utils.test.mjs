import test from "ava";
import sharp from 'sharp';
import {getImageFromS3, storeImageToS3} from "../../src/utils/s3-image-utils.mjs";

test.serial('Get Image from S3', async t => {
    try {
        const buffer = await getImageFromS3('20210427/trip1/3F7A0039.JPG');
        const bufferResized = await sharp(buffer).resize(300, 200, {
            kernel: sharp.kernel.lanczos3,
            fit: 'contain'
        }).toBuffer();
        await storeImageToS3('20210427/trip1/3F7A0039_m.JPG', bufferResized);
    } catch (e) {
        console.log(e);
    }
});