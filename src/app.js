"use strict";
import {render} from "preact";
import {useState, useReducer, useEffect} from "preact/hooks";
import "preact/debug";
import {html} from "htm/preact";

import Midi, {initialState as midiInitialState, reducer as midiReducer} from "./midi.js";
import Transport from "./midi-transport.js";
import Clock from "./midi-clock.js";

import {ACTION as MIDI_INPUT_ACTION} from "./midi-input.js";

const ACTION = {
    SET_INTERACTIVE: Symbol("SET_INTERACTIVE"),
    MIDI_AVAILABILITY: Symbol("MIDI_AVAILABILITY"),
};

const rootReducer = (state, action = {}) => {
    const {type, payload = {}} = action;

    switch (type) {
        case ACTION.MIDI_AVAILABILITY:
            return {
                ...state,
                midiAvailable: payload
            };

        case MIDI_INPUT_ACTION.MESSAGE:
             return {
             	...state,
             	incomingMessages: [
             		...state.incomingMessages,
             		payload
             	]
             };

        default:
            return state;
    }
};

const reducer = (state, action = {}) => {
    return {
        ...rootReducer(state, action),
        midi: midiReducer(state.midi, action)
    };
};

const initialState = {
	incomingMessages: [],
	midi: {...midiInitialState}
};


const hexString = (number) => number.toString(16);

function App (props) {
	const [state, dispatch] = useReducer(reducer, initialState);
	const {midiAvailable, incomingMessages = [], midi : {outputs = []}} = state;

    return html`
        <main>
            <h1>Web MIDI</h1>
            <${Midi} dispatch=${dispatch} state=${state.midi} />
            ${incomingMessages.length > 0 ? incomingMessages.map(({data}, index) => html`<div key=${index}>${Array.from(data).map(byte => hexString(byte)).join("-")}</div>`) : null}
            ${(outputs && outputs[0] && outputs[0].port.connection === "open") ? html`
            	<Fragment>
            	    <${Transport} port=${outputs[0].port} />
            	    <${Clock} port=${outputs[0].port} />
            	<//>
            	` : null
            }
        </main>
    `;
}


render(html`<${App} />`, document.body);
