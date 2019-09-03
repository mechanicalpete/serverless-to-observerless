import * as AWS from 'aws-sdk';
import { Config, S3 } from 'aws-sdk';
import { PutObjectRequest } from 'aws-sdk/clients/s3';
import { RockPaperScissorsGame } from './types';
import { BUCKET_NAME } from './constants';
import { logger } from './logging';

let s3Client: S3;
export function getS3Client(): S3 {

    logger.info('getS3Client()');

    /* istanbul ignore next */
    if (!s3Client) {
        let configurationS3: AWS.S3.ClientConfiguration = new Config();

        configurationS3.apiVersion = '2012-08-10';
        /* istanbul ignore next */ // Overrides for local testing with localstack
        if (process.env.OVERRIDE_S3_LOCAL_ENDPOINT) {
            configurationS3.endpoint = process.env.OVERRIDE_S3_LOCAL_ENDPOINT;
            configurationS3.credentials = { accessKeyId: 'string', secretAccessKey: 'string' };
            configurationS3.region = '@@AwsRegion@@';
            configurationS3.s3ForcePathStyle = true;
        }

        s3Client = new S3(configurationS3);
    }

    return s3Client;
}

export async function storeResultsPage(game: RockPaperScissorsGame, contents: string): Promise<void> {
    logger.info('storeResultsPage()');

    const putRequest: PutObjectRequest = {
        Bucket: BUCKET_NAME,
        Key: `${game.gameId}.html`,
        ContentType: 'text/html',
        Body: contents,
        ACL: 'public-read'
    };

    logger.info(`PutObjectRequest: ${JSON.stringify(putRequest)}`);
    const putResponse = await getS3Client().putObject(putRequest).promise();
    logger.info(`PutObjectResponse: ${JSON.stringify(putResponse)}`);
}
