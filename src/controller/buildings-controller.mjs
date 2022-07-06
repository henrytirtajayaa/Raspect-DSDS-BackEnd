import {getBuilding, createBuildings, filterBuildings} from "../logic/buildings-logic.mjs";

export default class BuildingsController{
    static async getBuilding(ctx){
        const structId = ctx.params.id;
        const building = await getBuilding(structId);
        ctx.body = building;
    }

    static async createBuildings(ctx) {
        const buildings = ctx.request.body;
        const newBuildings = await createBuildings(buildings);
        ctx.body = newBuildings;
    }

    static async filterBuildings(ctx){
        const searchString = ctx.query.searchString;
        const field = ctx.query.field;
        const buildings = await filterBuildings(searchString, field);
        ctx.body = buildings;
    }
}