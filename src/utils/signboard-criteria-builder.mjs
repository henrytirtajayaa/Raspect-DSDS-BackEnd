import _ from 'lodash';

function getRectangleBound(bound) {
    return [[
        [bound.topLeft[0], bound.topLeft[1]],
        [bound.topLeft[0], bound.bottomRight[1]],
        [bound.bottomRight[0], bound.bottomRight[1]],
        [bound.bottomRight[0], bound.topLeft[1]],
        [bound.topLeft[0], bound.topLeft[1]]
    ]];
}

const precisionToMeterMap = {
    1: 100,
    2: 60,
    3: 15,
    4: 3,
    5: 1
}

function calShiftedLongitude(longitude, latitude, meter){
    const earth = 6378.137;  
    const pi = Math.PI;
    const m = (1 / ((2 * pi / 360) * earth)) / 1000;
    return longitude + (meter * m) / Math.cos(latitude * (pi / 180));
}

const PRECISION_THRESHOLD_TO_RETURN_SIGNBOARD_DETAILS = 5;

export default class SignboardCriteriaBuilder {
    constructor(searchCriteria) {
        this.searchCriteria = searchCriteria;
        this.aggregateStages = [];
    }

    buildFilterStage(){
        let match = {
            "revisionStatus.signboardIdentificationRevised.status": {
                $ne: "deleted"
            }
        };
        if(this.searchCriteria.signboardId.length > 0){
            var signboardId = this.searchCriteria.signboardId
            var signboardIds = _.split(signboardId, ',')
            
            match.signboardId = {
                "$in": signboardIds
            }
        }
        if(this.searchCriteria.tripRefId){
            match.tripRefId = this.searchCriteria.tripRefId;
        }
        if(this.searchCriteria?.boundary?.bound){
            match.location = {
                $geoWithin: {
                    $geometry: {
                        type: "Polygon",
                        coordinates: getRectangleBound(this.searchCriteria.boundary.bound)
                    }
                }
            }
        }
        this.aggregateStages.push({
            $match: match
        });
        if(this.searchCriteria.fileRef){
            this.aggregateStages.push({
                $lookup: {
                    from: 'buildings', 
                    localField: 'structId', 
                    foreignField: 'structId', 
                    as: 'building'
                }
            },{
                $unwind: {
                    path: "$building",
                    preserveNullAndEmptyArrays: true
                }
            },{
                $match: {
                    'building.fileRef': this.searchCriteria.fileRef
                }
            });
        }
        return this;
    }

    buildGroupingStage(){
        let groupingStage = {
            $group: {
                _id: {
                    long: { $round: [{$arrayElemAt: [ "$location.coordinates", 0 ]}, this.searchCriteria.boundary.precision] },
                    lat: { $round: [{$arrayElemAt: [ "$location.coordinates", 1 ]}, this.searchCriteria.boundary.precision] },
                    signboardType: "$signboardType"
                },
                signboardCount: { "$sum": 1 }
            }
        }
        if(this.searchCriteria.boundary.precision >= PRECISION_THRESHOLD_TO_RETURN_SIGNBOARD_DETAILS){
            groupingStage["$group"]["signboards"] = { $push : "$$ROOT" };
        }
        this.aggregateStages.push(groupingStage);
        return this;
    }

    seperateDefectiveNNormalSignboardMarkerLoc(groupedCoordinates){
        const meter = precisionToMeterMap[this.searchCriteria.boundary.precision];
        groupedCoordinates.forEach(coordinate => {
            if(coordinate.signboardCount > 1){
                if(coordinate._id.signboardType == "defective"){
                    coordinate._id.long = calShiftedLongitude(coordinate._id.long, coordinate._id.lat, meter);
                } else if(coordinate._id.signboardType == "normal"){
                    coordinate._id.long = calShiftedLongitude(coordinate._id.long, coordinate._id.lat, -meter);
                }
            }
        });
        return groupedCoordinates;
    }
}