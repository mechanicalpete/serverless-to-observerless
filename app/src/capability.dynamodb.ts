import { DataMapper } from '@aws/dynamodb-data-mapper';
import * as AWS from 'aws-sdk';
import { Config, DynamoDB } from 'aws-sdk';
import { logger } from './logging';
import { RockPaperScissorsGame, RockPaperScissorsGameItem } from './types';

let dynamoDbClient: DynamoDB;
export function getDynamoDBClient(): DynamoDB {
    logger.info('getDynamoDBClient()');
    if (!dynamoDbClient) {
        let configurationDynamoDB: AWS.DynamoDB.ClientConfiguration = new Config();
        configurationDynamoDB.apiVersion = '2012-08-10';
        configurationDynamoDB.signatureVersion = 'v4';
        /* istanbul ignore next */
        if (process.env.OVERRIDE_DYNAMODB_LOCAL_ENDPOINT) {
            configurationDynamoDB.endpoint = process.env.OVERRIDE_DYNAMODB_LOCAL_ENDPOINT;
            configurationDynamoDB.region = '@@AwsRegion@@';
            configurationDynamoDB.credentials = { accessKeyId: 'string', secretAccessKey: 'string' };
        }
        dynamoDbClient = new DynamoDB(configurationDynamoDB);
    }
    return dynamoDbClient;
}

export async function storeGameResults(game: RockPaperScissorsGame): Promise<void> {
    logger.info('storeGameResults()');

    const client: DynamoDB = getDynamoDBClient();
    const Item: RockPaperScissorsGameItem = Object.assign(new RockPaperScissorsGameItem, {
        Id: game.gameId,
        GamePayload: game,
    });

    const mapper = new DataMapper({ client });
    await mapper.put(Item);
}
