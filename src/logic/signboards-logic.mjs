import getConnection from "../model/connection-factory.mjs";
import SignboardCriteriaBuilder from "../utils/signboard-criteria-builder.mjs";
import FilterSignboardBuilder from "../utils/filter-signboard-builder.mjs";
import {getSignedUrlFromS3} from "../utils/s3-image-utils.mjs";
import _ from 'lodash';
import {genSignboardId, genDefectId} from "../utils/signboard-utils.mjs";
import {exportCSV} from "../utils/export-utils.mjs";
import {FILTER_FIELD, FILTER_FIELD_NAME, SIGNBOARD_TYPE_NAME_MAP} from "../constant/filter.mjs";
import {TEAM_ROLES} from "../constant/role.mjs";
import {DEFECT_STATUS} from "../constant/defectTypes.mjs";
import moment from "moment";
import {getSurvey} from './surveys-logic.mjs';
import {getTrip} from './trips-logic.mjs';
import haversine from 'haversine-distance';
import {getTeam} from './team-logic.mjs';
import path from 'path';
import  fs from 'fs';
import yazl from 'yazl';
import fetch from 'node-fetch';

export async function getSignboardInfo(signboardId){
    const db = await getConnection();
    const Signboard = db.model('Signboard');
    const result = await Signboard.aggregate([
        {
            $match: {
                // signboardId: signboardId,
                signboardId: {
                    $in: signboardId
                }
            }
        },
        {
            $lookup: {
                from: 'buildings',
                localField: 'structId',
                foreignField: 'structId',
                as: 'building'
            }
        },
        {
            $unwind: {
                path: "$building",
                preserveNullAndEmptyArrays: true
            }
        }
    ]);
    return result;
}

// AI Detect new signboard
export async function createSignboardsWithImages(signboards) {
    const db = await getConnection();
    const Trip = db.model('Trip');
    const Signboard = db.model('Signboard');
    const SignboardImage = db.model('SignboardImage');
    const Photo = db.model('Photo');
    const result = [];
    
    for (let signboard of signboards){
        
        let signboardSaved = null;
        let oldSignboard = await Signboard.findOne({
            groupId: signboard.groupId
        });
        if(oldSignboard){
            signboardSaved = oldSignboard;
        } else {
            let trip = await Trip.findOne({
                refId: signboard.tripRefId
            });
            const signboardLastNum =  _.get(trip, 'signboardLastNum', 0);
            signboard.signboardId = genSignboardId(signboard.tripRefId, signboardLastNum + 1);
            signboard.surveyId = trip.surveyId;
            signboardSaved = new Signboard(signboard);
            await signboardSaved.save();
            trip.signboardLastNum = signboardLastNum + 1;
            await trip.save();
        }

        let defectCount = 0;
        let defectCountForSelectedImages = 0;
        let sampledImageCount = 0;
        let defectTypes = new Set();
        let insertSignboardImages = [];
        let signboardImages = signboard.images;
        delete signboard.images;
        for(let [idx, image] of signboardImages.entries()){
            const originalPhoto = await Photo.findOne({
                filename: image.filename
            });
            if(originalPhoto){
                image.signboardId = signboardSaved.signboardId;
                image.signboardAnnotation.defectId = genDefectId(signboard.signboardId, "signboard", idx + 1);
                image.originalPhotoId = originalPhoto._id;
                
                for(let item of ['highResPath', 'mediumResPath', 'lowResPath', 'highResMatrix', 'mediumResMatrix', 'lowResMatrix', 'shootingDirection', 'batchNo', 'cameraLocation', 'capturedAt', 'sampling', 'isUsedIn3dModelGen', 'tripRefId']){
                    image[item] = originalPhoto[item];
                }
                image.defectAnnotations.forEach((annotation) => {
                    defectCount ++;
                    annotation.defectId = genDefectId(signboard.signboardId, annotation.defectType, defectCount);
                    if(image.selectionOrder <= 2){
                        defectCountForSelectedImages ++;
                        defectTypes.add(annotation.defectType);
                    }
                });
                if(originalPhoto.sampling && image.selectionOrder <= 2){
                    sampledImageCount ++;
                }
                insertSignboardImages.push(image);
            }
        }
        if(defectCountForSelectedImages > 0){
            signboardSaved.signboardType = "defective";
            signboardSaved["dsrnHandling.dsrnToBeServed"] = true;
        } else {
            signboardSaved.signboardType = "normal";
        }
        signboardSaved.defectTypes = Array.from(defectTypes);
        signboardSaved.defectCount = defectCountForSelectedImages;
        signboardSaved.defectLastNum = defectCount;
        if(sampledImageCount > 2){
            signboardSaved.sampling = true;
        } else {
            signboardSaved.sampling = false;
        }
        await signboardSaved.save();
        result.push(signboardSaved);
        if(oldSignboard){
            await deleteSignboardImagesBySignboardIds([signboardSaved.signboardId]);
        }
        if(!_.isEmpty(insertSignboardImages)){
            await SignboardImage.insertMany(insertSignboardImages);
        }
    }

    return result.map((signboard) => signboard.toObject());
}

export async function searchSignboards(signboardCriteria) {
    
    const db = await getConnection();
    const Signboard = db.model('Signboard');
    const signboardCriteriaBuilder = new SignboardCriteriaBuilder(signboardCriteria);


    const mongoCriteria = signboardCriteriaBuilder.buildFilterStage().buildGroupingStage().aggregateStages;
    let signboards = await Signboard.aggregate(mongoCriteria).exec();
    return signboardCriteriaBuilder.seperateDefectiveNNormalSignboardMarkerLoc(signboards);
}

export async function filterSignboardsByField(filterParams) {
    const db = await getConnection();
    const Signboard = db.model('Signboard');
    let mongoCriteria = {};
    let field = '';
    
    if(!_.isEmpty(filterParams.signboardIdRange)){
        field = "signboardId";
        let signboardIds = [];
        let signboardIdRange = filterParams.signboardIdRange;
        if(signboardIdRange.length == 1){
            if(!_.isEmpty(signboardIdRange[0])){
                signboardIds.push(new RegExp(signboardIdRange[0], "gi"));
            }
        } else if(signboardIdRange.length == 2){
            if(!_.isEmpty(signboardIdRange[0]) && !_.isEmpty(signboardIdRange[1])){
                const startSquence = parseInt(signboardIdRange[0]);
                const endSquence = parseInt(signboardIdRange[1]);
                const sequenceNumRange = _.range(startSquence, endSquence + 1);
                _.each(sequenceNumRange, sequenceNum => {
                    signboardIds.push(new RegExp(sequenceNum, "gi"));
                });
            }
        }
        mongoCriteria[field] = {
            "$in": signboardIds
        };
    }
    else if(!_.isEmpty(filterParams.dsrnNo)){
        field = "form.dsrnNo";
        mongoCriteria[field] = new RegExp(filterParams.dsrnNo, "gi");
    }
    else if(!_.isEmpty(filterParams.addressSignOwers)){
        field = "form.addressSignOwers";
        mongoCriteria[field] = new RegExp(filterParams.addressSignOwers, "gi");
    }
    else if(!_.isEmpty(filterParams.seniorPro)){
        field = "peopleInCharge.seniorPro";
        mongoCriteria[field] = new RegExp(filterParams.seniorPro, "gi");
    }
    else if(!_.isEmpty(filterParams.caseOfficer)){
        field = "peopleInCharge.caseOfficer";
        mongoCriteria[field] = new RegExp(filterParams.caseOfficer, "gi");
    }
    else if(!_.isEmpty(filterParams.caseAssistant)){
        field = "peopleInCharge.caseAssistant";
        mongoCriteria[field] = new RegExp(filterParams.caseAssistant, "gi");
    }
    if(!_.isEmpty(mongoCriteria)){
        let signboards = await Signboard.find(mongoCriteria, {
            [field]: 1
        }).exec();
        let result = signboards.map(signboard => {
            return _.get(signboard, field);
        });
        result = new Set(result);
        return Array.from(result);
    } else {
        return [];
    }
}

export async function filterSignboards(filterParams) {
    const db = await getConnection();
    const Signboard = db.model('Signboard');

    filterParams.status = [null]
    const filterSignboardBuilder = new FilterSignboardBuilder(filterParams);
    const filterCriteria = filterSignboardBuilder.buildFilterStage().buildSortStage().buildPaginationStage().aggregateStages;
    const countSignboardBuilder = new FilterSignboardBuilder(filterParams);
    const countCriteria = countSignboardBuilder.buildFilterStage().buildCountStage().aggregateStages;

    let [signboards, totalCount] = await Promise.all([
        await Signboard.aggregate(filterCriteria).exec(),
        await Signboard.aggregate(countCriteria).exec()
    ]);
    totalCount = _.get(totalCount, '[0].totalCount', 0);

    return {signboards, totalCount};
}

export async function getPendingSignboardStatus(filterParams){
    const db = await getConnection();
    const Signboard = db.model('Signboard');
    const filterSignboardBuilder = new FilterSignboardBuilder(filterParams);
    const filterCriteria = filterSignboardBuilder.buildFilterStage().buildPaginationStage().aggregateStages;
    const countSignboardBuilder = new FilterSignboardBuilder(filterParams);
    const countCriteria = countSignboardBuilder.buildFilterStage().buildCountStage().aggregateStages;
    let [signboards, totalCount] = await Promise.all([
        await Signboard.aggregate(filterCriteria).exec(),
        await Signboard.aggregate(countCriteria).exec()
    ]);
    totalCount = _.get(totalCount, '[0].totalCount', 0);
    return {signboards, totalCount};
}

export async function searchSignboardImages(signboardId){
    const db = await getConnection();
    const SignboardImage = db.model('SignboardImage');
    let signboardImages = await SignboardImage.find({
        signboardId: signboardId
    });
    if(signboardImages.length > 1){
        signboardImages = _.orderBy(signboardImages, image => {
            image.selectionOrder;
        });
    }
    if(signboardImages.length > 3){
        signboardImages = _.slice(signboardImages, 0, 3);
    }
    return signboardImages.map((image)=> {
        let imageObject = image.toObject();

        imageObject.highResPath = getSignedUrlFromS3(imageObject.highResPath);
        imageObject.mediumResPath = getSignedUrlFromS3(imageObject.mediumResPath);
        imageObject.lowResPath = getSignedUrlFromS3(imageObject.lowResPath);

        if(imageObject.frontViewPath && imageObject.sideViewPath && imageObject.topViewPath){
            imageObject.frontViewPath = getSignedUrlFromS3(imageObject.frontViewPath, 'dsds-lidar');
            imageObject.sideViewPath = getSignedUrlFromS3(imageObject.sideViewPath, 'dsds-lidar');
            imageObject.topViewPath = getSignedUrlFromS3(imageObject.topViewPath, 'dsds-lidar');
        }
        imageObject.defectAnnotations = _.filter(image.defectAnnotations, defectAnnotation => defectAnnotation.status != DEFECT_STATUS.DELETED)

        return imageObject;
    });
}

export async function countMatchingSignboardWithCategory(signboardCriteria, ...categories) {
    return {
        totalCount: 100,
        categories: [
            {
                name: 'dsrnStatus',
                countPerAttributes: [
                    {name: 'issued', count: 60},
                    {name: 'notIssued', count: 40}
                ]
            },
            {
                name: 'caseStatus',
                countPerAttributes: [
                    {name: 'assigned', count: 15},
                    {name: 'notAssigned', count: 10},
                    {name: 'handled', count: 75},
                ]
            },
        ],
    }
}

export async function updateSignboard(post, signboardId, updateParams) {
    const db = await getConnection();
    const Signboard = db.model('Signboard');
    let signboard = await Signboard.findOne({
        signboardId: signboardId
    });
    if(signboard){
        function setStatus(signboard, field, value){
            signboard.revisionStatus[field].status = value;
            signboard.revisionStatus[field].updated = new Date();
            signboard.revisionStatus[field].updatedBy = post;
        }
        if(_.get(updateParams, 'verified') != undefined){
            setStatus(signboard, 'verified', updateParams.verified);
        }
        if(_.get(updateParams, 'structId') != undefined){
            setStatus(signboard, 'structId', updateParams.structId);
        }
        if(_.get(updateParams, 'signboardIdentification') != undefined){
            setStatus(signboard, 'signboardIdentificationRevised', updateParams.signboardIdentification);
            if(updateParams.signboardIdentification === "deleted"){
                signboard.verified = false;
                setStatus(signboard, 'verified', false);
                const GroupedSignboard = db.model('GroupedSignboard');
                await GroupedSignboard.updateMany({
                    groupId: signboard.groupId
                }, {
                    $set: {
                        status: 'deleted'
                    }
                });
            }
        }
        for(const field in updateParams){
            signboard[field] = updateParams[field];
        }
        await signboard.save();
        return signboard;
    } else {
        return {};
    }
}

export async function bulkUpdateSignboards(signboards){
    const db = await getConnection();
    const Signboard = db.model('Signboard'); 
    let bulkWriteQuery = [];
    _.each(signboards, (signboard) => {
        if(signboard.signboardId && signboard.updateParams){
            bulkWriteQuery.push({
                updateOne: {
                    filter: {
                        signboardId: signboard.signboardId
                    },
                    update: {
                        $set: signboard.updateParams
                    }
                }
            });
        }
    });
    if(!_.isEmpty(bulkWriteQuery)){
        return await Signboard.bulkWrite(bulkWriteQuery);
    }
    return [];
}

export async function bulkUpdateSignboardImages(signboardImages){
    const db = await getConnection();
    const SignboardImage = db.model('SignboardImage'); 
    let bulkWriteQuery = [];
    _.each(signboardImages, (signboardImage) => {
        if(signboardImage.signboardId && signboardImage.updateParams){
            bulkWriteQuery.push({
                updateOne: {
                    filter: {
                        signboardId: signboardImage.signboardId
                    },
                    update: {
                        $set: signboardImage.updateParams
                    }
                }
            });
        }
    });
    if(!_.isEmpty(bulkWriteQuery)){
        return await SignboardImage.bulkWrite(bulkWriteQuery);
    }
    return [];
}

export async function exportSignboardList(ctx, exportParams){
    const filteredSignboards = _.get(await filterSignboards(exportParams), 'signboards');
    let content = ",";
    for(const [waypointIdx, field] of exportParams.display.entries()){
        if(waypointIdx == exportParams.display.length - 1){
            content += FILTER_FIELD_NAME[field];
        } else {
            content += FILTER_FIELD_NAME[field] + ',';
        }
    }
    content += '\n';
    for(const [signboardIdx, signboard] of filteredSignboards.entries()){
        content += (signboardIdx + 1) + ',';
        for(const [idx, field] of exportParams.display.entries()){
            if(FILTER_FIELD.SURVEY_START_TIME == field){
                content += moment(signboard[FILTER_FIELD.SURVEY_START_TIME]).format("DD/MM/YYYY hh:mm:ss") + ' - ' + moment(signboard[FILTER_FIELD.SURVEY_END_TIME]).format("DD/MM/YYYY hh:mm:ss") + ',';
            } else if (FILTER_FIELD.SIGNBOARD_TYPE == field){
                content += SIGNBOARD_TYPE_NAME_MAP[signboard[field]] + ',';
            } else if (FILTER_FIELD.DSRN_NO == field){
                if(signboard[field]){
                    content += signboard[field];
                }
            } else {
                content += signboard[field] + ',';
            }
        }
        content += '\n';
    }
    await exportCSV(ctx, content, "signboard-list");
}

export async function deleteSignboardsBySignboardIds(deleteSignboardIds){
    const db = await getConnection();
    const Signboard = db.model('Signboard');
    await Signboard.deleteMany({
        signboardId: {
            $in: deleteSignboardIds
        }
    });
    return deleteSignboardIds;
}

export async function deleteSignboardImagesBySignboardIds(deleteSignboardIds){
    const db = await getConnection();
    const SignboardImage = db.model('SignboardImage');
    await SignboardImage.deleteMany({
        signboardId: {
            $in: deleteSignboardIds
        }
    });
    return deleteSignboardIds;
}

export async function deleteSignboardsNImagesByTripId(tripRefId){
    const db = await getConnection();
    const Signboard = db.model('Signboard');
    const SignboardImage = db.model('SignboardImage');
    await SignboardImage.deleteMany({
        tripRefId
    });
    await Signboard.deleteMany({
        tripRefId
    });
    return tripRefId;
}

async function getSignboardGroupedByBuilding(tripRefId, distributionOption){
    const db = await getConnection();
    const Signboard = db.model('Signboard');
    let match = { 
        tripRefId,
        status: {
            $not: {
                $in: ["Pending", "Processed"]
            }
        }
    };
    if(distributionOption == 'defective'){
        match.signboardType = 'defective';
    } else if (distributionOption == 'all'){
        match.sampling = true;
    }
    const buildings =  await Signboard.aggregate([
        {
            $match: match
        },{
            $group: {
                _id: "$structId",
                signboardCount: { "$sum": 1 },
                signboards: {$push: "$$ROOT"}
            }
        },{
            $lookup: {
                from: 'buildings',
                localField: '_id',
                foreignField: 'structId',
                as: 'building'
            }
        },{
            $unwind: {
                path: "$building",
                preserveNullAndEmptyArrays: true
            }
        },{
            $project: {
                structId: "$_id",
                signboardCount: 1,
                signboards: 1,
                lat: "$building.lat",
                lon: "$building.lon"
            }
        }
    ]);
    return buildings;
}

function setSignboardWithoutStructIdAsBuildingWithSingleSignboard(buildings){
    const signboardsWithoutStructId = _.remove(buildings, (building) => building.structId == null);
    if(!_.isEmpty(signboardsWithoutStructId)){
        _.each(signboardsWithoutStructId[0].signboards, signboard => {
            buildings.push({
                signboardCount: 1,
                signboards: [signboard],
                lon: signboard.location.coordinates[0],
                lat: signboard.location.coordinates[1]
            });
        });
    }
    return buildings;
}

function sortBuildingByWaypoints(buildings, waypoints){
    for (let building of buildings){
        let minDistBtwBldgNWaypoint = Number.MAX_SAFE_INTEGER;
        let order = 0;
        for(const [waypointIdx, waypointCoordinate] of waypoints.coordinates.entries()){
            const distBtwBldgNWaypoint = haversine({
                lat: building.lat,
                lon: building.lon
            },{
                lat: waypointCoordinate[1],
                lon: waypointCoordinate[0]
            });
            if(distBtwBldgNWaypoint < minDistBtwBldgNWaypoint){
                minDistBtwBldgNWaypoint = distBtwBldgNWaypoint;
                order = waypointIdx;
            }
        }
        building.order = order;
    }
    return _.orderBy(buildings, ['order']); 
}

export async function distributeSignboardsBySurveyId(surveyId){
    const survey = await getSurvey(surveyId);
    let result = {};
    if(survey){
        for(let tripId of survey.tripIds){
            let teamSignboardCountMap = await distributeSignboardsByTripId(tripId);
            result[tripId] = teamSignboardCountMap;
        }
    }
    return result;
}

export async function distributeSignboardsByTripId(tripRefId){
    const trip = await getTrip(tripRefId);
    const survey = await getSurvey(trip.surveyId);
    let buildings = await getSignboardGroupedByBuilding(tripRefId, survey.distributionOption);
    buildings = setSignboardWithoutStructIdAsBuildingWithSingleSignboard(buildings);
    const totalSignboardCount = _.sumBy(buildings, building => building.signboardCount);
    let orderedBuildings = sortBuildingByWaypoints(buildings, trip.waypoints);
    const teamIds = survey.teamIds;
    let teamIdMembersMap = {};
    for (const teamId of teamIds){
        const team = await getTeam(teamId);
        teamIdMembersMap[teamId] = {};
        _.each(_.values(TEAM_ROLES), role => {
            teamIdMembersMap[teamId][role] = team[role];
        });
    }
    let averageSignboardCountPerTeam  = totalSignboardCount/ teamIds.length;
    let teamSignboardCountMap = {};
    _.each(teamIds, teamId => {
        teamSignboardCountMap[teamId] = 0;
    });
    let accSignboardCountPerTeam = 0;
    let accSignboardCount = 0;
    let teamIdx = 0;
    let bulkWriteQuery = [];
    _.each(orderedBuildings, (building) => {
        if(accSignboardCountPerTeam >= averageSignboardCountPerTeam && teamIds[teamIdx + 1]){
            teamIdx += 1;
            averageSignboardCountPerTeam = (totalSignboardCount - accSignboardCount) / (teamIds.length - teamIdx);
            accSignboardCountPerTeam = 0;
        }
        teamSignboardCountMap[teamIds[teamIdx]] += building.signboardCount;
        accSignboardCountPerTeam += building.signboardCount;
        accSignboardCount += building.signboardCount;

        const teamId = teamIds[teamIdx];
        const membersMap = teamIdMembersMap[teamId];
        _.each(building.signboards, signboard => {
            bulkWriteQuery.push({
                updateOne: {
                    filter: {
                        signboardId: signboard.signboardId
                    },
                    update: {
                        $set: {
                            verified: false,
                            "revisionStatus.verified.status": false,
                            "revisionStatus.verified.updated": null,
                            "revisionStatus.verified.updatedBy": "",
                            peopleInCharge: {
                                [TEAM_ROLES.SENIOR_PRO]: _.get(membersMap, TEAM_ROLES.SENIOR_PRO),
                                [TEAM_ROLES.CASE_OFFICER]: _.get(membersMap, TEAM_ROLES.CASE_OFFICER),
                                [TEAM_ROLES.CASE_ASSISTANT]: _.get(membersMap, TEAM_ROLES.CASE_ASSISTANT)
                            }
                        }
                    }
                }
            })
        })
    });
    const db = await getConnection();
    const Signboard = db.model('Signboard');
    if (!_.isEmpty(bulkWriteQuery)) {
        await Signboard.bulkWrite(bulkWriteQuery);
    }
    return teamSignboardCountMap;
}

export async function exportImages(ctx, signboardIds){
    const db = await getConnection();
    const SignboardImage = db.model('SignboardImage');
    const signboardImages = await SignboardImage.find({
        signboardId: {
            $in: signboardIds
        }
    }, {}, {
        projection: {
            filename: 1,
            highResPath: 1
        }
    });
    let zipfile = new yazl.ZipFile();
    const zipFileName = `images.zip`;
    ctx.set('Content-Disposition', `inline; filename="${zipFileName}"`);
    ctx.type = "application/octet-stream";
    ctx.body = zipfile.outputStream;

    for (let image of signboardImages){
        const link = await getSignedUrlFromS3(image.highResPath);
        const fetchedImage = await fetch(link);
        const buffer = await fetchedImage.buffer();
        zipfile.addBuffer(buffer, image.filename);
    }
    zipfile.end();
}


async function addLidarImageToSignboardImage(refId){
    const db = await getConnection();
    // console.log(db)
    const Signboard = db.model('Signboard');
    // console.log(await Signboard.findOne());
    const SignboardImage = db.model('SignboardImage');

    let tripFolder = path.join("/Volumes/dsds-data/dsds-lidar", refId)
    let folders = fs.readdirSync(tripFolder)

    for (let folderName of folders){
        if(folderName == ".DS_Store"){
            continue
        }
        let splitedFolderName = folderName.split('_');
        let groupId = splitedFolderName[0];
        // let groupId = "2021-01_4991";
        let imageFilename = [splitedFolderName[1], splitedFolderName[2], splitedFolderName[3]].join('_') + '.jpg';
        let filename = path.join(refId, imageFilename);
        // let filename = "2021-01_TRIP-28/P2022011128_485_2906.jpg"
        
        let signboard = await Signboard.findOne({
            groupId
        },{
            signboardId: 1
        });
        if(_.isEmpty(signboard)){
            continue
        }

        let boxPoints = JSON.parse(fs.readFileSync(path.join(tripFolder, folderName, 'box_points.json')));

        let signboardId = signboard.signboardId;

        await SignboardImage.findOneAndUpdate({
            signboardId,
            filename
        },{
            $set: {
                signboard3DAnnotation: boxPoints,
                frontViewPath: path.join(refId, folderName, 'front_view.jpg'),
                sideViewPath: path.join(refId, folderName, 'side_view.jpg'),
                topViewPath: path.join(refId, folderName, 'top_view.jpg')
            }
        })
        console.log("done")
    }
}

// addLidarImageToSignboardImage("2021-01_TRIP-26")