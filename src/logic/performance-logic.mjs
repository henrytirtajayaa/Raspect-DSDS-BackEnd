import getConnection from "../model/connection-factory.mjs";
import _ from 'lodash';

export async function getSignboardStatistics(surveyId, startTime, endTime) {
    const db = await getConnection();
    const Trip = db.model('Trip');
    const Photo = db.model('Photo');
    let match = {}
    if(surveyId){
        match.surveyId = surveyId
    }
    if(startTime && endTime){
        match.startTime = {
            $gte: new Date(startTime),
            $lte: new Date(endTime)
        }
    }
    let trips = await Trip.aggregate([
        {
            $match: match
        },{
            $sort: {
                refId: 1
            }
        },{
            $lookup: {
                from: 'surveys',
                localField: 'surveyId',
                foreignField: 'surveyId',
                as: 'survey'
            }  
        },{
            $unwind: "$survey"
        },{
            $lookup: {
                from: 'signboards',
                localField: 'refId',
                foreignField: 'tripRefId',
                as: 'signboards'
            }  
        },{
            $project: {
                refId: 1,
                tripRefId: "$refId",
                sampleSize: "$survey.sampleSize",
                signboards: "$signboards"
            }
        }
    ]);
    let result = []
    for(let trip of trips){
        const signboards = trip.signboards
        let sampledSignboardCount = 0;
        let aiSampledSignboardCount = 0;
        let aiSampledDeletedSignboardCount = 0;
        let manualSampledSignboardCount = 0;
        let defectiveSignboardCount = 0;
        let defectiveSampledSignboardCount = 0;
        let aiDefectiveNoChangeSignboardCount = 0;
        let aiDefectiveSignboardCount = 0;
        let manualDefectiveSampledSignboardCount = 0;
        let normalSignboardCount = 0;
        signboards.forEach(signboard => {
            const status = signboard.status
            if(status == 'Pending' || status == 'Processed'){
                return false
            }

            const isManualCreate = signboard.isManualCreate
            const isSampled = signboard.sampling
            const isDefective = (signboard.signboardType === "defective")
            const isDeleted = (signboard.revisionStatus.signboardIdentificationRevised.status === "deleted")
            const noChange = (signboard.revisionStatus.signboardIdentificationRevised.status === "noChange") &&
                (signboard.revisionStatus.defectiveSignboardRevised.status === "noChange") && 
                (signboard.revisionStatus.defectTypeModified.status === false)

            if(                   isSampled                             ) sampledSignboardCount += 1
            if(!isManualCreate && isSampled)                              aiSampledSignboardCount += 1
            if(!isManualCreate && isSampled &&                 isDeleted) aiSampledDeletedSignboardCount += 1
            if( isManualCreate && isSampled &&                !isDeleted) manualSampledSignboardCount += 1

            if(                                isDefective              ) defectiveSignboardCount += 1    
            if(                   isSampled && isDefective              ) defectiveSampledSignboardCount += 1
            if(!isManualCreate &&              isDefective               && noChange) aiDefectiveNoChangeSignboardCount += 1
            if(!isManualCreate &&              isDefective              ) aiDefectiveSignboardCount += 1
            if( isManualCreate && isSampled && isDefective && !isDeleted) manualDefectiveSampledSignboardCount += 1

            if(                               !isDefective              ) normalSignboardCount += 1

            trip.signboardDetectionAccuracy = (aiSampledSignboardCount - aiSampledDeletedSignboardCount) / 
                (aiSampledSignboardCount + manualSampledSignboardCount) * 100

            trip.defectDetectionAccuracy = (aiDefectiveNoChangeSignboardCount) /
                (aiDefectiveSignboardCount + manualDefectiveSampledSignboardCount * 100 / trip.sampleSize) * 100;

        });
        const sampledImageCount = await Photo.count({
            tripRefId: trip.tripRefId,
            sampling: true
        });

        trip.sampledSignboardCount = sampledSignboardCount
        trip.defectiveSampledSignboardCount = defectiveSampledSignboardCount;
        trip.defectiveSignboardCount = defectiveSignboardCount;
        trip.normalSignboardCount = normalSignboardCount
        trip.sampledImageCount = sampledImageCount

        delete trip.signboards;

        trip.samplingRate = trip.sampleSize;
        result.push(trip)
    };
    return result
}