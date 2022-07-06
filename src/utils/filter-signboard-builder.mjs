import _ from 'lodash';

export default class FilterSignboardBuilder {

    constructor(filterCriteria) {
        this.filterCriteria = filterCriteria;
        this.aggregateStages = [];
    }

    buildFilterStage() {
        let matchBeforeJoin = {};
        if(!_.isEmpty(this.filterCriteria.status)){
            matchBeforeJoin.status = {
                "$in": this.filterCriteria.status
            }
        }
        if(!_.isEmpty(this.filterCriteria.createdAtRange)){
            matchBeforeJoin.createdAt = {
                "$gte": new Date(this.filterCriteria.createdAtRange[0]),
                "$lte": new Date(this.filterCriteria.createdAtRange[1])
            }
        }
        if(!_.isEmpty(this.filterCriteria.resultSignboardId)){
            matchBeforeJoin.resultSignboardId = {
                "$in": this.filterCriteria.resultSignboardId
            }
        }
        if(!_.isEmpty(this.filterCriteria.signboardId)){
            matchBeforeJoin.signboardId = {
                "$in": this.filterCriteria.signboardId
            }
        }
        if(!_.isEmpty(this.filterCriteria.surveyId)){
            matchBeforeJoin.surveyId = {
                "$in": this.filterCriteria.surveyId
            }
        }
        if(!_.isEmpty(this.filterCriteria.tripId)){
            matchBeforeJoin.tripRefId = this.filterCriteria.tripId
        }
        if(!_.isEmpty(this.filterCriteria.signboardType)){
            matchBeforeJoin.signboardType = this.filterCriteria.signboardType
        }
        if(!_.isEmpty(this.filterCriteria.headroom)){
            matchBeforeJoin.headroom = {
                $gte: parseFloat(this.filterCriteria.headroom[0]),
                $lte: parseFloat(this.filterCriteria.headroom[1])
            }
        }
        if(!_.isEmpty(this.filterCriteria.projection)){
            matchBeforeJoin.projection = {
                $gte: parseFloat(this.filterCriteria.projection[0]),
                $lte: parseFloat(this.filterCriteria.projection[1])
            }
        }
        if(!_.isEmpty(this.filterCriteria.sampled)){
            if(this.filterCriteria.sampled == "yes"){
                matchBeforeJoin.sampling = true;
            } else if (this.filterCriteria.sampled == "no"){
                matchBeforeJoin.sampling = false
            }
        }
        if(!_.isEmpty(this.filterCriteria.verified)){
            if(this.filterCriteria.verified == "yes"){
                matchBeforeJoin.verified = true;
            } else if (this.filterCriteria.verified == "no"){
                matchBeforeJoin.verified = false;
            }
        }
        if(!_.isEmpty(_.get(this.filterCriteria.peopleInCharge, 'seniorPro'))){
            matchBeforeJoin['peopleInCharge.seniorPro'] = {
                $in: this.filterCriteria.peopleInCharge.seniorPro
            }
        }
        if(!_.isEmpty(_.get(this.filterCriteria.peopleInCharge, 'caseOfficer'))){
            matchBeforeJoin['peopleInCharge.caseOfficer'] = {
                $in: this.filterCriteria.peopleInCharge.caseOfficer
            }
        }
        if(!_.isEmpty(_.get(this.filterCriteria.peopleInCharge, 'caseAssistant'))){
            matchBeforeJoin['peopleInCharge.caseAssistant'] = {
                $in: this.filterCriteria.peopleInCharge.caseAssistant
            }
        }
        if(!_.isEmpty(_.get(this.filterCriteria.revisionStatus, "signboardIdentificationRevised"))){
            matchBeforeJoin['revisionStatus.signboardIdentificationRevised.status'] = this.filterCriteria.revisionStatus.signboardIdentificationRevised;
        }
        if(!_.isEmpty(_.get(this.filterCriteria.revisionStatus, "defectiveSignboardRevised"))){
            matchBeforeJoin['revisionStatus.defectiveSignboardRevised.status'] = this.filterCriteria.revisionStatus.defectiveSignboardRevised;
        }
        if(_.isBoolean(_.get(this.filterCriteria.revisionStatus, "defectTypeModified"))){
            matchBeforeJoin['revisionStatus.defectTypeModified.status'] = this.filterCriteria.revisionStatus.defectTypeModified
        }
        if(!_.isEmpty(_.get(this.filterCriteria.revisionStatus, "boundingAreaRevised"))){
            if(this.filterCriteria.revisionStatus.boundingAreaRevised === "signArea"){
                matchBeforeJoin['revisionStatus.signboardBoundingAreaRevised.status'] = true;
            } else if(this.filterCriteria.revisionStatus.boundingAreaRevised === "defect"){
                matchBeforeJoin['revisionStatus.defectBoundingAreaRevised.status'] = true;
            } else if(this.filterCriteria.revisionStatus.boundingAreaRevised === "noChange"){
                matchBeforeJoin['revisionStatus.signboardBoundingAreaRevised.status'] = false;
                matchBeforeJoin['revisionStatus.defectBoundingAreaRevised.status'] = false;
            }
        }
        if(_.isBoolean(_.get(this.filterCriteria.dsrnHandling, "dsrnToBeServed"))){
            matchBeforeJoin['dsrnHandling.dsrnToBeServed'] = this.filterCriteria.dsrnHandling.dsrnToBeServed;
        }
        if(!_.isEmpty(_.get(this.filterCriteria.dsrnHandling, "dsrnNo"))){
            matchBeforeJoin['dsrnHandling.dsrnNo'] = {
                $in: this.filterCriteria.dsrnHandling.dsrnNo
            }
        }
        if(!_.isEmpty(_.get(this.filterCriteria.dsrnHandling, "account"))){
            matchBeforeJoin['dsrnHandling.account'] = this.filterCriteria.dsrnHandling.account;
        }
        if(!_.isEmpty(_.get(this.filterCriteria.dsrnHandling, "inspectionProformaPath"))){
            if(this.filterCriteria.dsrnHandling.inspectionProformaPath == "generated"){
                matchBeforeJoin['dsrnHandling.inspectionProformaPath'] = "generated";
            } else {
                matchBeforeJoin['dsrnHandling.inspectionProformaPath'] = {
                    $exists: false
                }
            }
        }
        if(!_.isEmpty(_.get(this.filterCriteria.dsrnHandling, "dsrnPath"))){
            if(this.filterCriteria.dsrnHandling.dsrnPath == "generated"){
                matchBeforeJoin['dsrnHandling.dsrnPath'] = "generated";
            } else {
                matchBeforeJoin['dsrnHandling.dsrnPath'] = {
                    $exists: false
                }
            }       
        }
        if(!_.isEmpty(_.get(this.filterCriteria.dsrnHandling, "coveringLetterPath"))){
            if(this.filterCriteria.dsrnHandling.coveringLetterPath == "generated"){
                matchBeforeJoin['dsrnHandling.coveringLetterPath'] = "generated";
            } else {
                matchBeforeJoin['dsrnHandling.coveringLetterPath'] = {
                    $exists: false
                }
            }        
        }
        if(!_.isEmpty(_.get(this.filterCriteria.dsrnHandling, "actionTaken"))){
            if(this.filterCriteria.dsrnHandling.actionTaken === "taken"){
                matchBeforeJoin['dsrnHandling.actionTaken'] = "taken";
            } else {
                matchBeforeJoin['dsrnHandling.actionTaken'] = {
                    $ne: "taken"
                };
            }
        }
        if(!_.isEmpty(_.get(this.filterCriteria.form, "addressSignOwers"))){
            matchBeforeJoin["form.addressSignOwers"] = {
                "$in": this.filterCriteria.form.addressSignOwers
            }
        }

        let match = {};
        if(!_.isEmpty(this.filterCriteria.surveyDateRange)){
            match.surveyStartTime = {
                "$gte": new Date(this.filterCriteria.surveyDateRange[0]),
                "$lte": new Date(this.filterCriteria.surveyDateRange[1])
            }
        }
        if(!_.isEmpty(this.filterCriteria.englishAddress)){
            match.englishAddress = {
                "$in": this.filterCriteria.englishAddress
            }
        }
        if(!_.isEmpty(this.filterCriteria.fileRef)){
            match.fileRef = {
                "$in": this.filterCriteria.fileRef
            }
        }
        if(!_.isEmpty(this.filterCriteria.areaCode)){
            match.areaCode = {
                "$in": this.filterCriteria.areaCode
            }
        }
        if(!_.isEmpty(this.filterCriteria.defectTypes)){
            if(_.includes(this.filterCriteria.defectTypes, 'notDefective')){
                match.defectTypes = [];
            } else {
                match.matchedDefectTypes = {
                    $exists: true, $not: {$size: 0} 
                }
            }
        }
        if(!_.isEmpty(_.get(this.filterCriteria.dsrnHandling, 'dsrnNotServeReason'))){
            match.matchedReason = {
                $exists: true, $ne: null, $not: {$size: 0} 
            }
        }
        if(!_.isEmpty(_.get(this.filterCriteria.revisionStatus, "defectTypeOriginal"))){
            match.originalDefectType = {
                "$in": this.filterCriteria.revisionStatus.defectTypeOriginal
            }
        }


        const defectTypes = (_.isEmpty(this.filterCriteria.defectTypes)) ? [] : this.filterCriteria.defectTypes;
        const reasons = (_.isEmpty(_.get(this.filterCriteria.dsrnHandling, 'dsrnNotServeReason'))) ? [] : this.filterCriteria.dsrnHandling.dsrnNotServeReason;
        const filterStage = [
            {
                $match: matchBeforeJoin
            },{
                $lookup: {
                    from: 'trips', 
                    localField: 'tripRefId', 
                    foreignField: 'refId', 
                    as: 'trip'
                }
            },{
                $lookup: {
                    from: 'buildings', 
                    localField: 'structId', 
                    foreignField: 'structId', 
                    as: 'building'
                }
            },
            {
                $lookup: {
                    from: 'signboardimages',
                    localField: 'signboardId',
                    foreignField: 'signboardId',
                    as: 'signboardimage',
                },
            },
            {
                $unwind: "$trip"
            },{
                $unwind: {
                    path: "$building",
                    preserveNullAndEmptyArrays: true
                }
            }, 
            {
                $project: {
                    _id: 1,
                    surveyId: 1,
                    tripId: "$trip.refId",
                    signboardId: 1,
                    signboardType: 1,
                    headroom: 1,
                    projection: 1,
                    verified: 1,
                    sampling: 1,
                    surveyStartTime: "$trip.startTime",
                    englishAddress: "$building.englishAddress",
                    areaCode: "$building.areaCode",
                    fileRef: "$building.fileRef",
                    defectTypes: 1,
                    matchedDefectTypes : {
                        $setIntersection: [defectTypes, "$defectTypes"]
                    },
                    matchedReason: {
                        $setIntersection: [reasons, "$dsrnHandling.dsrnNotServeReason"]
                    },

                    originalDefectType: {
                        $reduce: {
                            input: "$signboardimage.defectAnnotations.originalDefectType",
                            initialValue: [],
                            in: {
                                $concatArrays: [ "$$this", "$$value" ]
                            }
                        }
                    },
                    status: 1,
                    resultSignboardId: 1,
                    createdAt: 1,
                    dsrnNo: "$dsrnHandling.dsrnNo"
                }
            },{
                $match: match
            },{
                $unset: ["matchedDefectTypes", "matchedReason"]
            }
        ];
        
        this.aggregateStages = this.aggregateStages.concat(filterStage);
        return this;
    }

    buildSortStage(){
        let sortStage = [];
        const sort = _.get(this.filterCriteria, 'sort');
        if(!_.isEmpty(sort)){
            sortStage = [{
                $sort : sort
            }]
        }
        this.aggregateStages = this.aggregateStages.concat(sortStage);
        return this;
    }

    buildPaginationStage(){
        let paginationStage = [];
        const page = _.get(this.filterCriteria, 'page');
        const pageSize = _.get(this.filterCriteria, 'pageSize');
        if(page != null && pageSize != null){
            paginationStage = [{
                $skip: (page * pageSize)
            }, {
                $limit: pageSize
            }]
        }
        this.aggregateStages = this.aggregateStages.concat(paginationStage);
        return this;
    }    

    buildCountStage(){
        this.aggregateStages = this.aggregateStages.concat([{
            $count: 'totalCount'
        }]);
        return this;
    }
}