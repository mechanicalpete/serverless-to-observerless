import { attribute, hashKey, table } from '@aws/dynamodb-data-mapper-annotations';
import { DYNAMODB_TABLE } from "./constants";

export class RockPaperScissorsGame {
    gameId: string;
    humanName: string;
    humanChose?: Choices;
    lambdaChose?: Choices;
    isDraw: boolean;
    didHumanWin: boolean;

    constructor(gameId: string, humanName: string, humanChose: Choices) {
        this.gameId = gameId;
        this.humanName = humanName;
        this.humanChose = humanChose;
    }
}

export class WinLossRatio {
    constructor(
        public humanWins: number,
        public lambdaWins: number
    ) { }
}

export enum Choices {
    ROCK, PAPER, SCISSORS
}

export interface CallbackResponse {
    statusCode: number;
    headers: {
        [key: string]: string
    }
    body?: string;
}

@table(DYNAMODB_TABLE)
export class RockPaperScissorsGameItem {
    @hashKey()
    Id: string;
    @attribute()
    GamePayload: RockPaperScissorsGame;
}

@table(DYNAMODB_TABLE)
export class WinLossRatioItem {
    @hashKey()
    readonly Id: string = 'WinLossRatio';
    @attribute()
    Ratio: WinLossRatio;
}

