import getConnection from "../model/connection-factory.mjs";
import {genSignboardId, genDefectId} from "../utils/signboard-utils.mjs";
import _ from 'lodash';
import {getSignedUrlFromS3} from "../utils/s3-image-utils.mjs";
import {searchSignboardImages} from "./signboards-logic.mjs";
import {DEFECT_TYPES, SIGNBOARD_STATUS, DEFECT_STATUS} from "../constant/defectTypes.mjs";
import {getImageIdFromFilename} from "../utils/signboard-utils.mjs";

export async function updateDefectAnnotation(post, signboardId, imageId, updateParams) {
    const db = await getConnection();
    const SignboardImage = db.model('SignboardImage');
    const Signboard = db.model('Signboard'); 
    const GroupedSignboard = db.model('GroupedSignboard'); 
    let signboard = await Signboard.findOne({
        signboardId
    });
    const oldSignboardImage = await SignboardImage.findOne({
        signboardId,
        _id: imageId
    },{
        filename: 1
    });

    let bulkWriteQuery = [];
    let bulkWriteGroupedSignboard = [];
    if(!_.isEmpty(updateParams.addAnnotations)){
        let defectLastNum = _.get(signboard, 'defectLastNum', 0);
        let newAnnotationCount = 0;
        let newAnnotations = [];
        updateParams.addAnnotations.forEach((annotation) => {
            newAnnotationCount ++;
            const sequenceNum = defectLastNum + newAnnotationCount;
            annotation.defectId = genDefectId(signboardId, annotation.defectType, sequenceNum);
            annotation.sequenceNum = sequenceNum;
            annotation.isManualCreate = true;
            newAnnotations.push(annotation);

            bulkWriteGroupedSignboard.push({
                insertOne: {
                    document: {
                        groupId: signboard.groupId,
                        type: "Feature",
                        tripId: signboard.tripRefId,
                        geometry: {
                            type: "Polygon",
                            coordinates: annotation.location.coordinates
                        },
                        properties: {
                            type: annotation.defectType,
                            imageId: getImageIdFromFilename(oldSignboardImage.filename)
                        },
                        detectionType: "manual"
                    }
                }
            });
        });

        bulkWriteQuery.push({
            updateOne: {
                filter: {
                    signboardId,
                    _id: imageId
                },
                update: {
                    $push: {
                        defectAnnotations: {
                            $each: newAnnotations
                        }
                    }
                }
            }
        });
        signboard.defectLastNum = defectLastNum + newAnnotationCount;
    }
    if(!_.isEmpty(updateParams.deleteAnnotations)){
        let deleteAnnotationIds = [];
        let deleteGroupedSignboardIds = [];
        updateParams.deleteAnnotations.forEach((annotation) => {
            deleteAnnotationIds.push(annotation._id);
            if(annotation.groupedSignboardId){
                deleteGroupedSignboardIds.push(annotation.groupedSignboardId);
            }
        });
        bulkWriteQuery.push({
            updateOne: {
                filter: {
                    signboardId,
                    _id: imageId,
                    "defectAnnotations._id": {
                        $in: deleteAnnotationIds
                    }
                },
                update: {
                    $set: {
                        "defectAnnotations.$.status": DEFECT_STATUS.DELETED
                    }
                }
            }
        });
        bulkWriteGroupedSignboard.push({
            updateMany: {
                filter: {
                    _id: {
                        $in: deleteGroupedSignboardIds
                    }
                },
                update: {
                    $set: {
                        status: 'deleted'
                    }
                }
            }
        });
    }

    if(!_.isEmpty(updateParams.modifyAnnotations)){
        updateParams.modifyAnnotations.forEach((modifyAnnotation => {
            if(_.isEmpty(modifyAnnotation._id)){
                return;
            }
            if(modifyAnnotation.defectType === DEFECT_TYPES.SIGNBOARD){
                bulkWriteQuery.push({
                    updateOne: {
                        filter: {
                            signboardId,
                            _id: imageId,
                            "signboardAnnotation._id": modifyAnnotation._id
                        },
                        update: {
                            $set: {
                                "signboardAnnotation.location": modifyAnnotation.location,
                                "signboardAnnotation.desc": modifyAnnotation.desc,
                                "signboardAnnotation.boundingBoxModified": true
                            }
                        }
                    }
                });
            } else {
                let updateParams = {};
                if(modifyAnnotation.location){
                    updateParams["defectAnnotations.$.location"] = modifyAnnotation.location;
                    updateParams["defectAnnotations.$.boundingBoxModified"] = true
                }
                if(modifyAnnotation.defectType){
                    updateParams["defectAnnotations.$.originalDefectType"] = modifyAnnotation.originalDefectType;
                    updateParams["defectAnnotations.$.defectType"] = modifyAnnotation.defectType;
                    updateParams["defectAnnotations.$.defectId"] = genDefectId(signboardId, modifyAnnotation.defectType, modifyAnnotation.sequenceNum);
                }
                if(modifyAnnotation.desc){
                    updateParams["defectAnnotations.$.desc"] = modifyAnnotation.desc;
                }
                bulkWriteQuery.push({
                    updateOne: {
                        filter: {
                            signboardId,
                            _id: imageId,
                            "defectAnnotations._id": modifyAnnotation._id
                        },
                        update: {
                            $set: updateParams
                        }
                    }
                });
            }
            if(modifyAnnotation.groupedSignboardId){
                let updateParams = {
                    boundingBoxModified: true
                }
                if(modifyAnnotation.location){
                    updateParams['geometry.coordinates'] = modifyAnnotation.location.coordinates;
                }
                bulkWriteGroupedSignboard.push({
                    updateOne: {
                        filter: {
                            _id: modifyAnnotation.groupedSignboardId
                        },
                        update: {
                            $set: updateParams
                        }
                    }
                });
            }
        }));
    }
    let insertedGroupedSignboardIds = [];
    if(!_.isEmpty(bulkWriteGroupedSignboard)){
        const result = await GroupedSignboard.bulkWrite(bulkWriteGroupedSignboard);
        if(!_.isEmpty(result.insertedIds)){
            insertedGroupedSignboardIds = Object.values(result.insertedIds);
        }   
    }
    if (!_.isEmpty(bulkWriteQuery)) {
        if(!_.isEmpty(insertedGroupedSignboardIds)){
            _.each(bulkWriteQuery[0].updateOne.update.$push.defectAnnotations.$each, (newAnnotation, idx) => {
                newAnnotation.groupedSignboardId = insertedGroupedSignboardIds[idx];
            });
        }
        await SignboardImage.bulkWrite(bulkWriteQuery);
    }

    if (!_.isEmpty(bulkWriteQuery) && _.get(signboard, 'status') != 'Pending' && _.get(signboard, 'status') != 'Processed') {
        
        function setRevisionStatus(signboard, field, value){
            signboard['revisionStatus'][field].status = value;
            signboard['revisionStatus'][field].updated = new Date();
            signboard['revisionStatus'][field].updatedBy = post;
        }

        const signboardImages = await searchSignboardImages(signboardId);
        const updatedDefectAnnotations = _.reduce(signboardImages, (updatedDefectAnnotations, signboardImage) => {
            let signboardImageDefectAnnotations = _.filter(signboardImage.defectAnnotations, annotation => annotation.status != DEFECT_STATUS.DELETED)
            return updatedDefectAnnotations.concat(signboardImageDefectAnnotations);
        }, []);

        let updatedDefectTypes = new Set();
        updatedDefectAnnotations.forEach((annotation) => {
            updatedDefectTypes.add(annotation.defectType);
        });
        signboard.defectTypes = Array.from(updatedDefectTypes);
        signboard.defectCount = updatedDefectAnnotations.length;

        if(!_.isEmpty(updateParams.addAnnotations)){
            setRevisionStatus(signboard, 'defectBoundingAreaRevised', true);
            if(signboard.signboardType == 'normal' && updatedDefectAnnotations.length > 0){
                signboard.signboardType = "defective";
                setRevisionStatus(signboard, 'defectiveSignboardRevised', 'defective');
            }
        }
        if(!_.isEmpty(updateParams.deleteAnnotations)){
            setRevisionStatus(signboard, 'defectBoundingAreaRevised', true);
            if(signboard.signboardType == 'defective' && updatedDefectAnnotations.length == 0){
                signboard.signboardType = "normal";
                setRevisionStatus(signboard, 'defectiveSignboardRevised', 'normal');
            }
        }
        if(!_.isEmpty(updateParams.modifyAnnotations)){
            updateParams.modifyAnnotations.forEach(annotation => {
                if(annotation.defectType == "signboard"){
                    if(annotation.location){
                        setRevisionStatus(signboard, 'signboardBoundingAreaRevised', true);
                    }
                } else {
                    if(annotation.location){
                        setRevisionStatus(signboard, 'defectBoundingAreaRevised', true);
                    }
                    if(annotation.defectType){
                        setRevisionStatus(signboard, 'defectTypeModified', true);
                    }
                }
            });
        }
        if(!_.isEmpty(updateParams.addAnnotations) || !_.isEmpty(updateParams.deleteAnnotations) || !_.isEmpty(updateParams.modifyAnnotations)){
            signboard.verified = false;
            setRevisionStatus(signboard, 'verified', false);
        }
        await signboard.save();
    }
    const updatedSignboardImage = await SignboardImage.findOne({
        signboardId,
        _id: imageId
    });
    if(updatedSignboardImage.highResPath && updatedSignboardImage.mediumResPath && updatedSignboardImage.lowResPath){
        updatedSignboardImage.highResPath = getSignedUrlFromS3(updatedSignboardImage.highResPath);
        updatedSignboardImage.mediumResPath = getSignedUrlFromS3(updatedSignboardImage.mediumResPath);
        updatedSignboardImage.lowResPath = getSignedUrlFromS3(updatedSignboardImage.lowResPath);
    }
    return updatedSignboardImage;
}

export async function registerSuspectedMissingSignboard(user, tripRefId, photoId, annotation) {
    const db = await getConnection();
    const Trip = db.model('Trip');
    const Photo = db.model('Photo'); 
    const Signboard = db.model('Signboard'); 
    const SignboardImage = db.model('SignboardImage'); 
    let trip = await Trip.findOne({
        refId: tripRefId
    },{
        signboardLastNum: 1
    });
    const signboardLastNum =  _.get(trip, 'signboardLastNum', 0);
    trip.signboardLastNum = signboardLastNum + 1;
    await trip.save();
    const photo = await Photo.findOne({
        _id: photoId
    });
    let signboard = new Signboard({
        signboardId: genSignboardId(tripRefId, signboardLastNum + 1),
        tripRefId: tripRefId,
        isManualCreate: true,
        status: "Pending",
        "revisionStatus.signboardIdentificationRevised.status": "added",
        [`peopleInCharge.${user.teamRole}`]: user.staffId,
        location: photo['location']
    });
    await signboard.save();
    let signboardImage = new SignboardImage({
        tripRefId,
        signboardId: signboard.signboardId,
        originalPhotoId: photoId,
        originalFilename: photo['filename'],
        signboardAnnotation: {
            defectId: genDefectId(signboard.signboardId, 'signboard', 1),
            isManualCreate: true,
            location: {
                type: "Polygon",
                coordinates: annotation
            },
            defectType: DEFECT_TYPES.SIGNBOARD
        },
        status: SIGNBOARD_STATUS.PENDING,
        highResPath: photo['highResPath'],
        mediumResPath: photo['mediumResPath'],
        lowResPath: photo['lowResPath'],
        cameraLocation: photo['cameraLocation'],
        location: photo['location']
    });
    await signboardImage.save();
    return {
        signboard,
        signboardImage
    }
}

export async function getPendingSignboards(signboardIds){
    const db = await getConnection();
    const Signboard = db.model('Signboard'); 
    const result = await Signboard.aggregate([
        {
            $match: {
                status: "Pending",
                signboardId: {
                    $in: signboardIds
                }
            }
        },
        {
            $lookup: {
                from: 'signboardimages',
                localField: 'signboardId',
                foreignField: 'signboardId',
                as: 'signboardimage'
            }
        },{
            $unwind: "$signboardimage"
        }
    ]);
    return _.map(_.groupBy(result, 'tripRefId'), (value, key) => ({
        tripRefId: key,
        signboards: value
    }));
}

export async function getGroupedSignboards(groupIds){
    const db = await getConnection();
    const GroupedSignboard = db.model('GroupedSignboard'); 
    if(_.isEmpty(groupIds)){
        return [];
    }
    return await GroupedSignboard.aggregate([
        {
            $match: {
                groupId: {
                    $in: groupIds
                },
                status: {
                    $not: {
                        $in: ["deleted"]
                    }
                }
            }
        },
        {
            $unset: ["properties.tie_points", 
                    "properties.raycasting.raycastLocation", 
                    "properties.imageLocation",
                    "properties.raycasting.raycastDistance"]
        },
        {
            $group: {
                _id: "$groupId",
                annotations: {$push: "$$ROOT"}
            }
        }
    ]);
}

export async function deleteGroupedSignboards(tripId){
    const db = await getConnection();
    const GroupedSignboard = db.model('GroupedSignboard'); 
    if(_.isEmpty(tripId)){
        return [];
    }
    
    return await GroupedSignboard.deleteMany({
        tripId
    });
}