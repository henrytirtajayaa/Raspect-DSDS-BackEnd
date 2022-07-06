import getConnection from "../model/connection-factory.mjs";
import _ from 'lodash';

export async function getBuilding(structId){
    if(structId && structId != 'undefined'){
        const db = await getConnection();
        const Building = db.model('Building');
        const building = await Building.findOne({
            structId
        });
        return building;
    } else {
        return {};
    }
}

export async function createBuildings(buildings){
    const db = await getConnection();
    const Building = db.model('Building');
    let insertBuildings = [];
    for (const building of buildings){
        const isExist = await Building.exists({
            "structId": building.structId
        });
        if(!isExist){
            insertBuildings.push(building);
        }
    }
    if(!_.isEmpty(insertBuildings)){
        return await Building.insertMany(insertBuildings);
    } else {
        return [];
    }
}

export async function filterBuildings(searchString, field){
    const db = await getConnection();
    const Building = db.model('Building');
    if(_.isEmpty(searchString) || !_.includes(['englishAddress', 'fileRef', 'areaCode'], field)){
        return [];
    }
    if(field === "englishAddress"){
        searchString = searchString.replace(' ', '.*');
    } 
    const buildings = await Building.find({
        [field]: new RegExp(searchString, "gi")
    });
    let result = buildings.map(building => {
        return _.get(building, field);
    });
    result = new Set(result);
    return Array.from(result);   
}