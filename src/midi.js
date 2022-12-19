"use strict";
import {useState, useEffect} from "preact/hooks";
import {html} from "htm/preact";

//import {ACTION as STATUS_ACTION} from "./status.js";

import MidiInput, {initialState as inputInitialState, ACTION as MIDI_INPUT_ACTION, reducer as midiInputReducer} from "./midi-input.js";
import MidiOutput, {initialState as outputInitialState, ACTION as MIDI_OUTPUT_ACTION, reducer as midiOutputReducer} from "./midi-output.js";

const initialState = {
    inputs: [],
    outputs: []
};

const ACTION = {
    MIDI_AVAILABILITY: Symbol("MIDI_AVAILABILITY"),
    MIDI_OUTPUTS_ADD_PORT: Symbol("MIDI_OUTPUTS_ADD_PORT"),
    MIDI_INPUTS_ADD_PORT: Symbol("MIDI_INPUTS_ADD_PORT"),
    MIDI_ACCESS_ERROR: Symbol("MIDI_ACCESS_ERROR"),
    MIDI_ACCESS_LOG: Symbol("MIDI_ACCESS_LOG"),
    ...MIDI_INPUT_ACTION,
    ...MIDI_OUTPUT_ACTION
};

const reducer = (state, action = {}) => {
    const {type, payload = {}} = action;
    const {id = null} = payload;

    if (Object.values(ACTION).indexOf(action.type) === -1) {
        return state;
    }

    switch (type) {
        case ACTION.MIDI_INPUTS_ADD_PORT:
            return {
                ...state,
                inputs: [
                    ...state.inputs,
                    payload
                ]
            };

        case ACTION.MIDI_OUTPUTS_ADD_PORT:
            return {
                ...state,
                outputs: [
                    ...state.outputs,
                    payload
                ]
            };
    }

    if (Object.values(MIDI_INPUT_ACTION).indexOf(action.type) !== -1) {
        const index = state.inputs.findIndex(port => port.id === id);
        if (index === -1) {
            return state;
        }

        return {
            ...state,
            inputs: [
                ...state.inputs.slice(0, index),
                midiInputReducer(state.inputs[index], action),
                ...state.inputs.slice(index + 1)
            ]
        };
    }

    if (Object.values(MIDI_OUTPUT_ACTION).indexOf(action.type) === -1) {
        const index = state.outputs.findIndex(port => port.id === id);
        if (index === -1) {
            return state;
        }

        return {
            ...state,
            outputs: [
                ...state.outputs.slice(0, index),
                midiOutputReducer(state.outputs[index], action),
                ...state.outputs.slice(index + 1)
            ]
        };
    }


    return state;
};

function MidiAvailability (props) {
    const {dispatch = () => null} = props;

    const [midiAvailable, setMidiAvailable] = useState(false);

    useEffect(() => {
        // testing if MIDI is available
        dispatch({type: ACTION.MIDI_AVAILABILITY, payload: !!navigator.requestMIDIAccess});
        setMidiAvailable(!!navigator.requestMIDIAccess);
    }, []);

    return html`
        <Fragment>
            ${midiAvailable ? props.children : null}
        </Fragment>
    `;
}


const sameId = (arr, id) => arr.find(element => element.id === id);


function Midi (props) {
    const {state = {}, dispatch = () => null} = props;
    const {inputs = [], outputs = []} = state;
    const [accessRequested, setAccessRequested] = useState(false);
    const [access, setAccess] = useState(null);
    const [accessError, setAccessError] = useState(null);

    useEffect(() => {
        // testing if MIDI is available
        dispatch({type: ACTION.MIDI_AVAILABILITY, payload: !!navigator.requestMIDIAccess});
    }, []);

    useEffect(() => {
        if (accessRequested) {
            navigator.requestMIDIAccess({"sysex": true}).then(setAccess, setAccessError);
            dispatch({type: ACTION.MIDI_ACCESS_LOG, payload: {text: "Requesting MIDI access", timestamp: new Date()}});
        }
    }, [accessRequested]);

    useEffect(() => {
        if (accessError !== null) {
            dispatch({
                type: ACTION.MIDI_ACCESS_ERROR,
                payload: {
                    text: `MIDI access error: ${accessError.name} - ${accessError.message} (code ${accessError.code})`,
                    timestamp: new Date()
                }
            });
            setAccessRequested(false);
        }
    }, [accessError]);

    const accessStateChangeHandler = (event) => {
        console.log({midi_statechange: event});
    };

    useEffect(() => {
        if (access !== null) {
            dispatch({type: ACTION.MIDI_ACCESS_LOG, payload: {text: "MIDI access granted!", timestamp: new Date()}});
            access.addEventListener("statechange", accessStateChangeHandler);

            const outputIterator = access.outputs.entries();
            for (let [id, port] of outputIterator) {
                dispatch({type: ACTION.MIDI_OUTPUTS_ADD_PORT, payload: {...outputInitialState, id, port, name: port.name}});
            }

            const inputIterator = access.inputs.entries();
            for (let [id, port] of inputIterator) {
                dispatch({type: ACTION.MIDI_INPUTS_ADD_PORT, payload: {...inputInitialState, id, port, name: port.name}});
            }
            return () => {
                access.removeEventListener("statechange", accessStateChangeHandler);
            };
        }
    }, [access]);


    return html`
        <${MidiAvailability} dispatch=${dispatch}>
            <section id="midi">
                <header><h2>MIDI</h2></header>
                ${inputs.map(port => html`<span>${port.id} - ${port.name}</span>`)}
                ${access !== null ? html`
                    <fieldset>
                        <legend>inputs</legend>
                        ${Array.from(access.inputs).map(([id, port]) => html`<${MidiInput} port=${port} key=${id} state=${sameId(state.inputs, id)} dispatch=${dispatch} />`)}
                    </fieldset>
                    <fieldset>
                        <legend>outputs</legend>
                        ${Array.from(access.outputs).map(([id, port]) => html`<${MidiOutput} port=${port} key=${id} state=${sameId(state.outputs, id)} dispatch=${dispatch} />`)}
                    </fieldset>
                ` : html`
                    <button disabled=${accessRequested} onClick=${() => setAccessRequested(true)}>${accessError ? "try again" : "connect midi"}</button>
                `}
            </section>
        <//>
    `;

}


export default Midi;

export {
    initialState,
    ACTION,
    reducer
};
