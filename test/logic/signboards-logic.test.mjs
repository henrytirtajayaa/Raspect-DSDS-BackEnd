import test from "ava";
import {createSignboardsWithImages} from "../../src/logic/signboards-logic.mjs";
import moment from "moment";

test.serial('Create Signboard', async t => {
    try {
        const signboards = [
            {
                "tripRefId": "20210603_5",
                "defectCount": 2,
                "location": {
                    "type": "Point",
                    "coordinates": [113.169437, 22.319314]
                },
                "images": [{
                    "location": {
                        "type": "Point",
                        "coordinates": [114.169437, 25.319314]
                    },
                    "signboardAnnotations": {}
                }]
            },{
                "tripRefId": "20210604_4",
                "defectCount": 2,
                "location": {
                    "type": "Point",
                    "coordinates": [115.169437, 23.319314]
                },
                "images": [{
                    "location": {
                        "type": "Point",
                        "coordinates": [116.169437, 24.319314]
                    },
                    "signboardAnnotations": {}
                }]
            }
        ]
        const signboardsSaved = await createSignboardsWithImages(signboards);
        t.true(signboardsSaved !== undefined);
    } catch (e) {
        console.log(e);
    }
});