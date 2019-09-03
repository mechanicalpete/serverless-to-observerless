import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda';
import { handler } from '../src/game/play-new-game';
import { BUCKET_NAME } from '../src/constants';

describe('Play New Game', (): void => {

    let event: APIGatewayProxyEvent;
    let context: Context;
    let callback: jest.Mock<Callback>;

    beforeEach(() => {
        event = eventFactory();
        context = contextFactory();
        callback = jest.fn();

    });

    it('Missing both required parameters', async () => {
        await handler(event, context, callback);

        expect(callback.mock.calls[0][0]).toEqual(new Error('Required parameters not passed'));
        expect(callback.mock.calls[0][1]).toBeUndefined();
    });

    it('Missing human choice required parameters', async () => {
        event.queryStringParameters = {
            humanName: 'UnitTester'
        }

        await handler(event, context, callback);

        expect(callback.mock.calls[0][0]).toEqual(new Error('Required parameters not passed'));
        expect(callback.mock.calls[0][1]).toBeUndefined();
    });
    it('Missing human name required parameters', async () => {
        event.queryStringParameters = {
            humanChoice: 'ROCK'
        }

        await handler(event, context, callback);

        expect(callback.mock.calls[0][0]).toEqual(new Error('Required parameters not passed'));
        expect(callback.mock.calls[0][1]).toBeUndefined();
    });

    it('Invalid human choice required parameters', async () => {
        event.queryStringParameters = {
            humanName: 'UnitTester',
            humanChoice: 'SPACESHIP'
        }

        await handler(event, context, callback);

        expect(callback.mock.calls[0][0]).toEqual(new Error('Invalid choice human. \'SPACESHIP\' is invalid!'));
        expect(callback.mock.calls[0][1]).toBeUndefined();

    });

    it('Happy Path', async () => {
        event.queryStringParameters = {
            humanChoice: 'ROCK',
            humanName: "UnitTester"
        }

        await handler(event, context, callback);

        expect(callback.mock.calls[0][0]).toBeNull();
        expect(callback.mock.calls[0][1]).toMatchObject({
            "headers": {
                "Cache-Control:": "no-cache, no-store, must-revalidate",
                "Expires": "0",
                "Pragma": "no-cache"
            },
            "statusCode": 307
        }
        );
        const regexLocation = new RegExp(`http://${BUCKET_NAME}.s3-website-${process.env.AWS_REGION}.amazonaws.com/[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}.html`);
        expect(callback.mock.calls[0][1].headers.Location).toMatch(regexLocation);
    });
});

function eventFactory(): APIGatewayProxyEvent {
    return {
        body: null,
        headers: {},
        httpMethod: 'post',
        isBase64Encoded: false,
        path: '',
        pathParameters: null,
        queryStringParameters: null,
        stageVariables: null,
        requestContext: {
            accountId: '',
            apiId: '',
            authorizer: {
            },
            httpMethod: '',
            identity: {
                accessKey: null,
                accountId: null,
                apiKey: null,
                caller: null,
                cognitoAuthenticationProvider: null,
                cognitoAuthenticationType: null,
                cognitoIdentityId: null,
                cognitoIdentityPoolId: null,
                sourceIp: '',
                user: null,
                userAgent: null,
                userArn: null,
            },
            stage: '',
            requestId: '',
            requestTimeEpoch: 0,
            resourceId: '',
            resourcePath: ''
        },
        resource: ''
    };
}

function contextFactory(): Context {
    return {
        callbackWaitsForEmptyEventLoop: false,
        functionName: '',
        functionVersion: '',
        invokedFunctionArn: '',
        memoryLimitInMB: 1024,
        awsRequestId: '',
        logGroupName: '',
        logStreamName: '',
        getRemainingTimeInMillis(): number { return 0; },
        done(error?: Error, result?: any): void { },
        fail: jest.fn(),
        succeed: jest.fn()
    };
}

