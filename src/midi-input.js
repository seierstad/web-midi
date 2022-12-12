"use strict";
import {useEffect} from "preact/hooks";
import {html} from "htm/preact";

import {MESSAGE_TYPE} from "./midi-constants.js";
import MidiPort from "./midi-port.js";

const initialState = {};

const actionPrefix = "MIDI_INPUT_";

const ACTION = {
    ADD_PORT: Symbol(actionPrefix + "ADD_PORT"),
    MESSAGE: Symbol(actionPrefix + "MESSAGE")
};

const reducer = (state, action = {}) => {
    return state;
};

function MidiInput (props) {
    const {
        port = null,
        dispatch = () => null
    } = props;

    const midiMessageHandler = (event) => {
        const {
            data,
            timestamp
        } = event;

        dispatch({type: ACTION.MESSAGE, payload: {data, timestamp}});
    };

    useEffect(() => {
        if (port !== null) {
            port.addEventListener("midimessage", midiMessageHandler);


            return () => {
                port.removeEventListener("statechange", midiMessageHandler);
            };
        }
    }, [port]);

    return MidiPort(props);
}

export default MidiInput;


export {
    initialState,
    ACTION,
    reducer
};
