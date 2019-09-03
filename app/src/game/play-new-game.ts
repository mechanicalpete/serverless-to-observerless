import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda';
import { v4 as uuid } from 'uuid';
import { storeGameResults } from '../capability.dynamodb';
// import { initialiseFunctionShield } from '../function-shield';
import { logger } from '../logging';
import { storeResultsPage } from '../capability.s3';
import { CallbackResponse, Choices, RockPaperScissorsGame } from '../types';
import { BUCKET_NAME } from '../constants';
import { String } from 'aws-sdk/clients/signer';

const AWSXRay = require('aws-xray-sdk');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

// initialiseFunctionShield();

export async function handler(requestEvent: APIGatewayProxyEvent, context: Context, callback: Callback) {

    recordLambdaEntry(requestEvent, context);

    const segment: Segment = AWSXRay.getSegment();
    let subsegment: Subsegment | undefined;

    AWS.config.logger = console;

    let game: RockPaperScissorsGame;

    try {

        subsegment = startSubSegment(segment, 'starting-game');
        let { humanName, humanChoice } = extractRequiredParameters(requestEvent);
        game = new RockPaperScissorsGame(uuid(), humanName, humanChoice);
        game.lambdaChose = playTurn();
        determineWinner(game);
        closeSubsegment(game, subsegment);

        subsegment = startSubSegment(segment, 'generating-html-results');
        if (game.isDraw) {
            await generateDrawResults(game);
        } else {
            await generateWinResults(game);
        }
        closeSubsegment(game, subsegment);

        subsegment = startSubSegment(segment, 'storing-results');
        await storeGameResults(game);
        closeSubsegment(game, subsegment);

        callback(null, generateRedirectResponse(game));
    } catch (error) {
        logger.error(error);
        if (subsegment) { subsegment.addError(error); }
        callback(error);
    } finally {
        segment.close();
    }

};

export function recordLambdaEntry(event: APIGatewayProxyEvent, context: Context): void {
    /* istanbul ignore next */
    logger.info(`${context.functionName}`)
}

function extractRequiredParameters(requestEvent: APIGatewayProxyEvent): { humanName: string, humanChoice: Choices } {
    let strHumanChoice: string;
    let humanChoice: Choices;

    if (requestEvent.queryStringParameters) {
        if (requestEvent.queryStringParameters.humanName
            && requestEvent.queryStringParameters.humanChoice) {
            strHumanChoice = requestEvent.queryStringParameters.humanChoice.trim().toUpperCase();
            switch (strHumanChoice) {
                case "ROCK": humanChoice = Choices.ROCK; break;
                case "PAPER": humanChoice = Choices.PAPER; break;
                case "SCISSORS": humanChoice = Choices.SCISSORS; break;
                default:
                    throw new Error(`Invalid choice human. '${requestEvent.queryStringParameters.humanChoice}' is invalid!`);
            }
            return {
                humanName: requestEvent.queryStringParameters.humanName,
                humanChoice
            };
        }
    }

    throw new Error('Required parameters not passed');
}

function playTurn(): Choices {
    logger.info(`playTurn()`);

    const random = Math.random();
    let choice: Choices;

    if (random < 0.334) {
        choice = Choices.ROCK;
    } else if (random < 0.667) {
        choice = Choices.PAPER;
    } else {
        choice = Choices.SCISSORS;
    }

    return choice;
}

function determineWinner(game: RockPaperScissorsGame): RockPaperScissorsGame {
    logger.info(`determineWinner() ${JSON.stringify(game)}`);

    game.isDraw = false;
    game.didHumanWin = false;

    if (game.humanChose === game.lambdaChose) {
        game.isDraw = true;
    } else {
        switch (game.humanChose) {
            case Choices.ROCK: game.didHumanWin = (game.lambdaChose === Choices.SCISSORS); break;
            case Choices.PAPER: game.didHumanWin = (game.lambdaChose === Choices.ROCK); break;
            case Choices.SCISSORS: game.didHumanWin = (game.lambdaChose === Choices.PAPER); break;
        }
    }

    return game;
}

async function generateDrawResults(game: RockPaperScissorsGame): Promise<void> {
    logger.info(`generateDrawResults() ${JSON.stringify(game)}`);

    const html = `<html><body><h1>Game is a draw as everyone chose ${Choices[game.humanChose as Choices]}</h1></body></html>`;
    await storeResultsPage(game, html);
}

async function generateWinResults(game: RockPaperScissorsGame): Promise<void> {
    logger.info(`generateWinResults() ${JSON.stringify(game)}`);
    let html: string;

    if (game.didHumanWin) {
        html = `<html><body><h1>${game.humanName} won with ${Choices[game.humanChose as Choices]} beating ${Choices[game.lambdaChose as Choices]}!</h1></body></html>`;
    } else {
        html = `<html><body><h1>Lambda won with ${Choices[game.lambdaChose as Choices]} beating ${Choices[game.humanChose as Choices]}!</h1></body></html>`;
    }

    await storeResultsPage(game, html);
}

function generateRedirectResponse(game: RockPaperScissorsGame): CallbackResponse {
    logger.info('generateResponse()');

    const location = `http://${BUCKET_NAME}.s3-website-${process.env.AWS_REGION}.amazonaws.com/${game.gameId}.html`;
    const callbackResponse: CallbackResponse = {
        statusCode: 307,
        headers: {
            'Location': location,
            'Cache-Control:': 'no-cache, no-store, must-revalidate',
            'Expires': '0', // invalid dates represent a date in the past
            'Pragma': 'no-cache'
        },
    };

    logger.info(`CallbackResponse: ${JSON.stringify(callbackResponse)}`);

    return callbackResponse;
}

function startSubSegment(segment: Segment, subsegmentName: string): Subsegment {
    return segment.addNewSubsegment(subsegmentName);
}

function closeSubsegment(game: RockPaperScissorsGame, subsegment?: Subsegment): void {
    if (subsegment) {
        subsegment.addAnnotation("game", JSON.stringify(game));
        subsegment.close();
    }
}

interface Segment {
    addNewSubsegment(name: string): Subsegment;
    close(): void;
}

interface Subsegment {
    addAnnotation(key: string, value: any): void;
    addError(error: Error): void;
    close(): void;
}