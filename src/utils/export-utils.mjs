import _ from 'lodash';

export async function exportCSV(ctx, content, filename){
    ctx.set('Content-disposition', `attachment; filename="${filename}.csv"`);
    ctx.statusCode = 200;
    ctx.body = content;
}