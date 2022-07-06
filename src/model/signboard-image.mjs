import mongoose from "mongoose";
import {DEFECT_STATUS} from "../constant/defectTypes.mjs";

const pointSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Point'],
        required: true
    },
    coordinates: {
        type: [Number],
        index: { type: '2dsphere', sparse: false },
        required: true
    }
});


const polygonSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Polygon'],
        required: true
    },
    coordinates: {
        type: [[[Number]]],
        required: true
    }
});

const imageAnnotationSchema = new mongoose.Schema( {
    defectId: {
        type: String,
        required: true
    },
    defectType: {
        type: String,
        required: true
    },
    originalDefectType: {
        type: String
    },
    location: {
        type: polygonSchema,
    },
    isManualCreate: {
        type: Boolean,
        enum: [true, false],
        default: false
    },
    status: {
        type: String,
        enum: [DEFECT_STATUS.ACTIVE, DEFECT_STATUS.DELETED],
        default: DEFECT_STATUS.ACTIVE
    },
    boundingBoxModified: Boolean,
    desc: String,
    sequenceNum: Number,
    groupedSignboardId: mongoose.Schema.Types.ObjectId
})

const schema = new mongoose.Schema({
    signboardId: {
        type: String,
        required: true,
        index: true,
    },
    originalPhotoId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    originalFilename: String,
    location: {
        type: pointSchema,
        index: '2dsphere'
    },
    cameraLocation: {
        type: pointSchema
    },
    shootingDirection: Number,
    batchNo: {
        type: Number
    },
    filename: {
        type: String,
    },
    lowResMatrix: [[Number]],
    mediumResMatrix: [[Number]],
    highResMatrix: [[Number]],
    lowResPath: String,
    mediumResPath: String,
    highResPath: String,
    signboardAnnotation: {
        type: imageAnnotationSchema,
        required: true,
    },
    defectAnnotations: {
        type: [imageAnnotationSchema],
    },
    status: {
        type: String,
        enum: ['Pending', 'Processed']
    },
    capturedAt: {
        type: Date,
    },
    sampling: {
        type: Boolean,
        default: false
    },
    isUsedIn3dModelGen: {
        type: Boolean,
        default: false
    },
    tripRefId: {
        type: String,
        required: true,
        index: true,
    },
    selectionOrder: {
        type: Number
    },
    signboard3DAnnotation: {
        type: [[Number]]
    },
    frontViewPath: String,
    sideViewPath: String,
    topViewPath: String
});

export default schema;