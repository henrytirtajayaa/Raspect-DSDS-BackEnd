import test from "ava";
import {generateCropImage, generateResponsiveImages} from "../../src/utils/image-processing-utils.mjs";
import {generateTestImageInS3} from "../logic/mock-data-helper.mjs";

test.serial('Generate test image', async t => {
    try {
        await generateTestImageInS3('20110611-1', '2', 'EOS1');
        console.log('Done');
    } catch (e) {
        console.log(e);
    }
});