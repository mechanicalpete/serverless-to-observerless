import { BUCKET_NAME, DYNAMODB_TABLE } from '../src/constants';
import { getS3Client } from '../src/capability.s3';
import { getDynamoDBClient } from '../src/capability.dynamodb';

export async function initialise(): Promise<void> {
    await initialiseS3();
    await initialiseDynamoDB();
}

async function initialiseS3() {
    const buckets = (await getS3Client().listBuckets().promise()).Buckets;
    let createStagingBucket = true;
    if (buckets) {
        createStagingBucket = buckets.findIndex((bucket, index, obj) => { return bucket.Name === BUCKET_NAME; }) === -1;
    }
    if (createStagingBucket) {
        await getS3Client().createBucket({ Bucket: BUCKET_NAME }).promise();
    }
}

async function initialiseDynamoDB() {
    const dynamodb = getDynamoDBClient();
    const tables = await dynamodb.listTables().promise();
    let stagingTable: string | undefined;
    if (tables.TableNames) {
        stagingTable = tables.TableNames.find((value, index, obj) => { return value === DYNAMODB_TABLE; });
    }
    if (!stagingTable) {
        await dynamodb.createTable({
            AttributeDefinitions: [{ AttributeName: "Id", AttributeType: "S", }],
            TableName: DYNAMODB_TABLE,
            KeySchema: [{ AttributeName: "Id", KeyType: "HASH", }],
            ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1, },
            SSESpecification: { Enabled: true },
        }).promise();
    }
}
