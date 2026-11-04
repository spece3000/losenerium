import { Chessboard, INPUT_EVENT_TYPE } from 'https://cdn.jsdelivr.net/npm/cm-chessboard@8/src/Chessboard.js';
import { FEN } from 'https://cdn.jsdelivr.net/npm/cm-chessboard@8/src/model/Position.js';

const game = new Chess();

const board = new Chessboard(document.getElementById('board'), {
    position: FEN.start,
    orientation: 'white',
    assetsUrl: 'https://cdn.jsdelivr.net/npm/cm-chessboard@8/assets/',
    style: {
        cssClass: 'default',
        showCoordinates: true
    }
});

board.enableMoveInput((event) => {
    switch (event.type) {
        case INPUT_EVENT_TYPE.moveInputStarted:
            return true;

        case INPUT_EVENT_TYPE.validateMoveInput: {
            const moves = game.moves({ square: event.squareFrom, verbose: true });
            return moves.some(m => m.to === event.squareTo);
        }

        case INPUT_EVENT_TYPE.moveInputFinished: {
            game.move({
                from: event.squareFrom,
                to: event.squareTo,
                promotion: 'q'
            });
            board.setPosition(game.fen(), false);
            return true;
        }

        case INPUT_EVENT_TYPE.moveInputCanceled:
            return true;
    }
});

new Swiper('.swiper', {
    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
    loop: true
});