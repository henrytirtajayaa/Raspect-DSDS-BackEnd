import fetch from "node-fetch";
import config from 'config';
import _ from 'lodash';

async function callGraphqlApi(query, variables = null){
    let body = {
        query
    }
    if(variables){
        body.variables = variables
    }
    return await fetch(config.get('workflow.endpoint'),{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.get('workflow.prefectToken')}`
        },
        body: JSON.stringify(body)
    }).then((res) => {return res.json()});
}

export async function runWorkflow(name, parameters){
    const response = await callGraphqlApi(
        `query GetLatestFlowRun{
            flow_run (where: {state: {_eq: "Running"}, flow: {name: {_eq: "${name}"}}}){
                id
            }
        }`
    );
    if(!_.isEmpty(response['data']['flow_run'])){
        return {
            status: false,
            err: "Pending items are running"
        };
    } else {
        const result = await callGraphqlApi(
            `query GetLatestFlowId{
                flow (order_by: {created: desc}, limit: 1,where: {name: {_eq: "${name}"}}){
                    id
                }
            }`
        );
        const latestFlowId = result['data']['flow'][0]['id'];
        await callGraphqlApi(
            `mutation ($parameters: JSON!){
                create_flow_run(input: { 
                    flow_id: "${latestFlowId}",
                    parameters: $parameters
                }) {
                    id
                }
            }`
        , {
            parameters
        });
        return {
            success: true
        }
    }
}