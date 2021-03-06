import { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda';
import { v4 as uuid } from 'uuid';
import { storeGameResults } from '../capability.dynamodb';
import { storeResultsPage } from '../capability.s3';
import { BUCKET_NAME } from '../constants';
import { logger } from '../logging';
import { CallbackResponse, Choices, RockPaperScissorsGame } from '../types';

const AWSXRay = require('aws-xray-sdk');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

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

    const html = generateShell(`Game is a draw as everyone chose ${Choices[game.humanChose as Choices]}`);
    await storeResultsPage(game, html);
}

async function generateWinResults(game: RockPaperScissorsGame): Promise<void> {
    logger.info(`generateWinResults() ${JSON.stringify(game)}`);
    let html: string;

    if (game.didHumanWin) {
        html = generateShell(`${game.humanName} won with ${Choices[game.humanChose as Choices]} beating ${Choices[game.lambdaChose as Choices]}!`);
    } else {
        html = generateShell(`Lambda won with ${Choices[game.lambdaChose as Choices]} beating ${Choices[game.humanChose as Choices]}!`);
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

function generateShell(body: string): string {
    let shell = '';

    shell += `<!DOCTYPE html>\n`;
    shell += `<html>\n`;
    shell += `<head>\n`;
    shell += `    <title>Win, Lost of Draw!</title>\n`;
    shell += `    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\n`;
    shell += `    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n`;
    shell += `    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:regular,bold,italic,thin,light,bolditalic,black,medium&amp;lang=en">\n`;
    shell += `    <link rel="stylesheet" href="https://storage.googleapis.com/code.getmdl.io/1.0.6/material.grey-pink.min.css" />\n`;
    shell += `    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">\n`;
    shell += `    <style>\n`;
    shell += `        .mdl-card__supporting-text {\n`;
    shell += `            width: unset;\n`;
    shell += `            padding: 6px;\n`;
    shell += `        }\n`;
    shell += `    </style>\n`;
    shell += `</head>\n`;
    shell += `<body>\n`;
    shell += `    <div class="mdl-layout mdl-js-layout mdl-layout--fixed-header">\n`;
    shell += `        <header class="mdl-layout__header">\n`;
    shell += `            <div class="mdl-layout__header-row">\n`;
    shell += `                <span class="mdl-layout__title">Win, Loss or Draw?</span>\n`;
    shell += `            </div>\n`;
    shell += `        </header>\n`;
    shell += `        <main class="mdl-layout__content">\n`;
    shell += `            <div class="mdl-grid">\n`;
    shell += `\n`;
    shell += `                <div class="mdl-cell mdl-cell--12-col mdl-card mdl-shadow--4dp">\n`;
    shell += `                    <div class="mdl-card__title">\n`;
    shell += `                        <h2 class="mdl-card__title-text">${body}</h2>\n`;
    shell += `                    </div>\n`;
    shell += `                    <div class="mdl-card__supporting-text">\n`;
    shell += `                        <button class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect" onclick="javascript:window.history.back()">Play Again?</button>\n`;
    shell += `                    </div>\n`;
    shell += `                </div>\n`;
    shell += `            </div>\n`;
    shell += `        </main>\n`;
    shell += `    </div>\n`;
    shell += `    <script src="https://storage.googleapis.com/code.getmdl.io/1.0.6/material.min.js"></script>\n`;
    shell += `</body>\n`;
    shell += `</html>\n`;

    return shell;
}
/*
window.history.back();
*/