import getConnection from "../model/connection-factory.mjs";
import _ from 'lodash';
import config from 'config';
import {generateResponsiveImages} from "../utils/image-processing-utils.mjs";
import loggerMiddleware from '../middleware/logger-middleware.mjs';
import {getSignedUrlFromS3} from "../utils/s3-image-utils.mjs";
import fetch from 'node-fetch';

const cameraDirectionOrder = {
    left_front: 1,
    left: 2,
    left_back: 3,
    right_back: 4,
    right: 5,
    right_front: 6
};

export async function createTripPhotos(photos) {
    const db = await getConnection();
    const Photo = db.model('Photo');
    const result = [];
    for (const photoInput of photos) {
        const photo = new Photo(photoInput);
        await photo.save();
        result.push(photo);
    }
    return result;
}

export async function resizePhotos(photos){
    // Perform Resize in background
    const spec = config.get('resize');
    for (const photo of photos) {
        await generateResponsiveImages(photo, spec).then((responsiveImagesResult) => {
            for (const propertyName of Object.keys(responsiveImagesResult)) {
                photo[propertyName] = responsiveImagesResult[propertyName];
            }
            photo.status = 'Processed';
            return photo.save();
        }).catch((e) => {
            loggerMiddleware().logger.error(e, 'Unable to resize image');
        })
    }
}

export async function getPhotoProcessingStatus(tripRefId){
    const db = await getConnection();
    const Photo = db.model('Photo');
    const procesedPhotoCount = await Photo.count({
        tripRefId,
        "status": "Processed"
    });
    const unprocesedPhotoCount = await Photo.count({
        tripRefId,
        "status": "New"
    });
    return {
        procesedPhotoCount,
        unprocesedPhotoCount
    }
}

export async function searchTripPhotos(tripRefId, location, batch) {
    const db = await getConnection();
    const Photo = db.model('Photo');
    async function findNearestBatchNoUsingLoc(location){
        const result = await Photo.find({
            tripRefId,
            location: {
                $near: {
                    $maxDistance: 10,
                    $geometry: {
                        type: "Point",
                        coordinates: location
                    }
                }
            }
        }, ['batchNo', 'location']);
        // Filter and return result in single batch
        const groupResult = _.groupBy(result, 'batchNo');
        let selectedBatchNo = null;
        for (const batchNo in groupResult) {
            if (selectedBatchNo == null) {
                selectedBatchNo = batchNo;
            } else if (groupResult[batchNo].length > groupResult[selectedBatchNo].length) {
                selectedBatchNo = batchNo;
            }
        }
        return parseInt(selectedBatchNo);
    }

    async function findNextOrPrevOrCurrentBatchNo(batchNo, direction){
        let batchNoQuery = {};
        if(direction === 1){
            batchNoQuery = {
                $gt: batchNo
            }
        } else if (direction === -1){
            batchNoQuery = {
                $lt: batchNo
            }
        } else if (direction === 0){
            batchNoQuery = batchNo // GET BATCH ID FOR USER INPUT
        }

        const result = await Photo.find({
            tripRefId,
            batchNo: batchNoQuery
        }).sort({
            batchNo: direction
        }).limit(1);
        
        return (!_.isEmpty(result)) ? result[0].batchNo: null;
    }
    
    const selectedBatchNo = (batch) ? await findNextOrPrevOrCurrentBatchNo(batch.no, batch.direction) : await findNearestBatchNoUsingLoc(location);
    let photos = await Photo.aggregate([
        {
            $match: {
                tripRefId,
                batchNo: selectedBatchNo
            }
        },{
            $lookup: {
                from: 'signboardimages',
                localField: '_id',
                foreignField: 'originalPhotoId',
                as: 'signboardimages'
            }
        },{
            $lookup: {
                from: 'signboards',
                localField: 'signboardimages.signboardId',
                foreignField: 'signboardId',
                as: 'signboards'
            }
        },{
            $project: {
                "_id": 1,
                "shootingDirection": 1,
                "batchNo": 1,
                "lowResMatrix": 1,
                "mediumResMatrix": 1,
                "highResMatrix": 1,
                "status" :1,
                "tripRefId": 1,
                "cameraId": 1,
                "location": 1,
                "filename": 1,
                "cameraDirection": 1,
                "cameraLocation": 1,
                "capturedAt": 1,
                "createdAt": 1,
                "highResPath": 1,
                "lowResPath": 1,
                "mediumResPath": 1,
                "signboardimages._id": 1,
                "signboardimages.signboardAnnotation": 1,
                "signboardimages.signboardId": 1,
                "signboardimages.status": 1,
                "signboards.signboardId": 1,
                "signboards.revisionStatus.signboardIdentificationRevised.status": 1,
                "isUsedIn3dModelGen": 1,
                "sampling": 1,
                "signboardimages.selectionOrder": 1,
                "signboardimages.defectAnnotations._id": 1
            }
        }
    ]);
    photos = photos.map((photo) => {
        let signboardIdIdentificationMap = {};
        if(!_.isEmpty(photo.signboards)){
            photo.signboards.forEach(signboard => {
                signboardIdIdentificationMap[signboard.signboardId] = _.get(signboard, 'revisionStatus.signboardIdentificationRevised.status')
            });
        }
        let photoObject = _.clone(photo);
        photoObject.signboardimages = [];
        if(!_.isEmpty(photo.signboardimages)){
            for(const image of photo.signboardimages){
                const status = signboardIdIdentificationMap[image.signboardId];
                if (status !== 'deleted'){
                    photoObject.signboardimages.push(image);
                }
            }
        }
        delete photoObject.signboards;
        if(photo.highResPath && photo.mediumResPath && photo.lowResPath){
            photoObject.highResPath = getSignedUrlFromS3(photo.highResPath);
            photoObject.mediumResPath = getSignedUrlFromS3(photo.mediumResPath);
            photoObject.lowResPath = getSignedUrlFromS3(photo.lowResPath);
        }
        return photoObject;
    });
    let sampling = false;
    if(!_.isEmpty(photos)){
        sampling = _.every(photos, photos => {
            return photos.sampling;
        })
    }
    return {
        batchNo: selectedBatchNo,
        sampling,
        coordinates: _.get(photos[0], 'cameraLocation.coordinates'),
        photos: _.orderBy(photos, photo => {
            return cameraDirectionOrder[photo.cameraDirection];
        })
    };
}

export async function deleteTripImages(tripRefId){
    const db = await getConnection();
    const Photo = db.model('Photo');
    return await Photo.deleteMany({
        tripRefId
    });
}

export async function exportImage(ctx, tripRefId, filename){
    const db = await getConnection();
    const Photo = db.model('Photo');
    const image = await Photo.findOne({
        filename: tripRefId + '/' + filename
    }, {
        filename: 1
    });
    if(image){
        const link = getSignedUrlFromS3(image.filename);
        const fetchedImage = await fetch(link);
        const buffer = await fetchedImage.buffer();
        ctx.set('Content-Disposition', `inline; filename="${filename}"`);
        ctx.type = "application/octet-stream";
        ctx.body = buffer;
    } else {
        throw new Error("Image does not exist");
    }
}

export async function getLidarImagePath(filename, groupId){
    return {
        html: getSignedUrlFromS3(`${groupId}/${filename}.html`, "dsds-lidar"),
        image: getSignedUrlFromS3(`${groupId}/${filename}.jpg`, "dsds-lidar")
    }
}

export async function getAllPredictionImagePath(tripId, filename){
    return getSignedUrlFromS3(`${tripId}/all-prediction-image/${filename}.jpg`)
}