import {DEFECT_TYPES_DISPLAY_NAME} from "../constant/defectTypes.mjs";

const SIGNBOARD_SEQUENCE_DIGIT_NUM = 5;
const DEFECT_SEQUENCE_DIGIT_NUM = 2;

export function genSignboardId(tripRefId, sequenceNum){
    return tripRefId + '_' + String(sequenceNum).padStart(SIGNBOARD_SEQUENCE_DIGIT_NUM, '0');
}

export function genDefectId(signboardId, defectType, sequenceNum){
    return signboardId + '_' + DEFECT_TYPES_DISPLAY_NAME[defectType] + '_' + String(sequenceNum).padStart(DEFECT_SEQUENCE_DIGIT_NUM, '0');
}

export function getImageIdFromFilename(filename){
    return filename.split('/')[1];
}