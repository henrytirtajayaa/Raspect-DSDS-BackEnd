import mongoose from "mongoose";

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


const schema = new mongoose.Schema({
    signboardId: {
        type: String,
        unique: true
    },
    tripRefId: {
        type: String,
        required: true,
        index: true,
    },
    surveyId: {
        type: String
    },
    defectCount: {
        type: Number,
        default: 0,
        index: true,
    },
    location: {
        type: pointSchema,
        index: '2dsphere',
    },
    structId: {
        type: Number,
        index: true,
    },
    sampling: {
        type: Boolean
    },
    verified: {
        type: Boolean,
        default: false
    },
    headroom: Number,
    projection: Number,
    width: Number,
    height: Number,
    thickness: Number,
    signboardType: {
        type: String,
        enum: ['defective', 'normal']
    },
    // Modification status tracking
    revisionStatus: {
        signboardIdentificationRevised: {
            status: {
                type: String,
                default: 'noChange',
                enum: ["added", "deleted", "noChange"]
            },
            updated: {type: Date, default: Date.now},
            updatedBy: String
        },
        defectiveSignboardRevised: {
            status: {
                type: String,
                default: 'noChange',
                enum: ["defective", "normal", "noChange"]
            },
            updated: {type: Date, default: Date.now},
            updatedBy: String
        },
        defectTypeModified: {
            status: {
                type: Boolean,
                default: false
            },
            updated: {type: Date, default: Date.now},
            updatedBy: String
        },
        signboardBoundingAreaRevised: {
            status: {
                type: Boolean,
                default: false
            },
            updated: {type: Date, default: Date.now},
            updatedBy: String
        },
        defectBoundingAreaRevised: {
            status: {
                type: Boolean,
                default: false
            },
            updated: {type: Date, default: Date.now},
            updatedBy: String
        },
        verified: {
            status: {
                type: Boolean,
                default: false
            },
            updated: {type: Date, default: Date.now},
            updatedBy: String
        },
        structId: {
            status: {
                type: Number
            },
            updated: {type: Date, default: Date.now},
            updatedBy: String
        }
    },
    peopleInCharge:{
        seniorPro: String,
        caseOfficer: String,
        caseAssistant: String
    },
    dsrnHandling: {
        dsrnToBeServed: Boolean,
        dsrnNo: String,
        dsrnNotServeReason: [String],
        account: {
            type: String,
            enum: ["public", "advance"]
        },
        inspectionProformaPath: {
            type: String,
            default: "notGenerated"
        },
        dsrnPath: {
            type: String,
            default: "notGenerated"
        },
        coveringLetterPath: {
            type: String,
            default: "notGenerated"
        },
        actionTaken: {
            type: String,
            enum: ["taken", "pending"],
            default: "pending"
        }
    },
    lastModifiedBy: {
        type: String,
    },
    defectTypes: {
        type: [String]
    },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Processed']
    },
    resultSignboardId: {
        type: String
    },
    isManualCreate: {
        type: Boolean
    },
    defectLastNum: {
        type: Number,
        default: 0
    },
    groupId: {
        type: String,
        index: true
    },
    primaryPhotoId: {
        type: mongoose.Schema.Types.ObjectId
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    form: {
        dateOfSurvey: Date,
        bdFile: String,
        addressSignOwers: String,
        addressSignOwersCN: String,
        signAddress: String,
        signAddressCN: String,
        areaCode: String,
        signOwer: String,
        signOwerCN: String,
        typeDefect: String,
        recordPhoto: String,
        location: {
            type: polygonSchema
        },
        actionRecommend: String,
        caseOfficer: String,
        caseOfficerCN: String,
        dsrnNo: String,
        postOfCaseOfficer: String,
        postOfCaseOfficerCN: String,
        phone: String,
        signType: [String],
        defectType: [String],
        signCompany: String,
        signCompanyCn: String,
        caseOfficer2: String,
        caseOfficerCN2: String,
        postOfCaseOfficer2: String,
        postOfCaseOfficerCN2: String,
        phone2: String,
        accountType: String,
    }
});

export default schema;
