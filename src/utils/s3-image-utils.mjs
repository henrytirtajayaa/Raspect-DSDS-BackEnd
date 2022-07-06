import AWS from 'aws-sdk';
import config from 'config';

AWS.config.update({
    region: 'ap-east-1',
    accessKeyId: config.get('s3.imageBucket.accessKeyId'),
    secretAccessKey: config.get('s3.imageBucket.secretAccessKey'),
});
const s3 = new AWS.S3();
const s3BucketName = config.get('s3.imageBucket.name');
const s3Expiry = config.get('s3.imageBucket.accessExpiry');

export async function getImageFromS3(url) {
    const data = await s3
        .getObject({ Bucket: s3BucketName, Key: url })
        .promise();
    return data.Body;
}

export async function storeImageToS3(url, buffer) {
    const data = {
        Key: url,
        Body: buffer,
        ContentType: 'image/jpeg',
        Bucket: s3BucketName,
    }
    return s3.putObject(data).promise();
}

export function getSignedUrlFromS3(url, bucket = s3BucketName) {
    const params = {Bucket: bucket, Key: url, Expires: s3Expiry};
    return s3.getSignedUrl('getObject', params);
}