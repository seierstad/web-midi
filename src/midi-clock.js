"use strict";

import {useState, useEffect} from "preact/hooks";
import {html} from "htm/preact";

import {
    MESSAGE_TYPE,
    SYSEX_TYPE
} from "./midi-constants.js";


const MIDI_CLOCK_PPQ = 24;
const DEFAULT_STATIC_TEMPO = 100;
const STATIC_TEMPO_MIN = 30;
const STATIC_TEMPO_MAX = 300;

const ACTION = {
    MIDI_CLOCK_SET_STATIC_TEMPO: Symbol("MIDI_CLOCK_SET_STATIC_TEMPO"),
    MIDI_CLOCK_SOURCE: Symbol("MIDI_CLOCK_SOURCE"),
    MIDI_CLOCK_NUMERATOR: Symbol("MIDI_CLOCK_NUMERATOR"),
    MIDI_CLOCK_DENOMINATOR: Symbol("MIDI_CLOCK_DENOMINATOR")
};

const initialState = {
    staticTempo: DEFAULT_STATIC_TEMPO,
    source: "static",
    running: false,
    fraction: {
        numerator: 1,
        denominator: 1
    }
};

const reducer = (state, action = {}) => {
    const {type, payload = {}} = action;

    switch (type) {
        case ACTION.MIDI_CLOCK_SET_STATIC_TEMPO:
            return {
                ...state,
                staticTempo: payload.value
            };

        case ACTION.MIDI_CLOCK_SOURCE:
            return {
                ...state,
                source: payload.value
            };

        case ACTION.MIDI_CLOCK_NUMERATOR:
            return {
                ...state,
                fraction: {
                    ...state.fraction,
                    numerator: payload.value
                }
            };

        case ACTION.MIDI_CLOCK_DENOMINATOR:
            return {
                ...state,
                fraction: {
                    ...state.fraction,
                    denominator: payload.value
                }
            };

    }

    return state;
};

class Clock {
    constructor (port, options = {}) {
        const {
            numerator = 1,
            denominator = 1
        } = options;

        this.port = port;
        this.interval = null;
        this.numerator = numerator;
        this.denominator = denominator;
        this.recalculateInterval = false;
        this._running = false;
        this._staticTempo = {value: 100};
        this.heartRate = {value: 40};
        this.source = "static";
    }

    start () {
        this.running = true;
        this.calculateClockInterval();
    }

    stop () {
        this.running = false;

        if (this.interval !== null) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    sendClock () {
        if (this.running) {
            this.port.send([SYSEX_TYPE.CLOCK]);
            if (this.recalculateInterval) {
                clearInterval(this.interval);
                this.calculateClockInterval();
            }
        } else {
            clearInterval(this.interval);
        }
    }

    calculateClockInterval () {
        const interval = 1000 * 60.0 / (this.selectedSource.value * this.numerator / this.denominator) / MIDI_CLOCK_PPQ;
        this.interval = setInterval(this.sendClock.bind(this), interval);
        this.recalculateInterval = false;
    }

    set source (source) {
        switch (source) {
            case "static":
                this.selectedSource = this._staticTempo;
                break;
            case "heart-rate":
                this.selectedSource = this.heartRate;
                break;
        }

        this.recalculateInterval = true;
    }

    get numerator () {
        return this._numerator;
    }
    set numerator (numerator) {
        this._numerator = numerator;
        this.recalculateInterval = true;
    }

    get denominator () {
        return this._denominator;
    }
    set denominator (denominator) {
        this._denominator = denominator;
        this.recalculateInterval = true;
    }

    set running (running) {
        this._running = running;
    }

    get running () {
        return this._running;
    }

    get staticTempo () {
        return this._staticTempo.value;
    }

    set staticTempo (staticTempo) {
        this._staticTempo.value = staticTempo;
        this.recalculateInterval = true;
    }
}

function ClockView (props) {
    const {port} = props;
    const [clock] = useState(new Clock(port));
    const [clockRunning, setClockRunning] = useState(false);
    const [clockSource, setClockSource] = useState("static");
    const [numerator] = useState(1);
    const [denominator] = useState(1);
    const [staticTempo, setStaticTempo] = useState(DEFAULT_STATIC_TEMPO);

    const clockStartHandler = () => {
        setClockRunning(true);
    };

    const clockStopHandler = () => {
        setClockRunning(false);
    };

    const numeratorHandler = (event) => {
        const value = parseInt(event.target.value, 10);
        //setNumerator(value);
        clock.numerator = value;
    };

    const denominatorHandler = (event) => {
        clock.denominator = parseInt(event.target.value, 10);
    };

    const clockSourceHandler = (event) => {
        setClockSource(event.target.value);
    };

    const staticTempoHandler = (event) => {
        setStaticTempo(parseInt(event.target.value, 10));
    };

    useEffect(() => {
        clock.source = clockSource;
    }, [clockSource]);

    useEffect(() => {
        if (clockRunning) {
            clock.start();
        } else if (clock.running) {
            clock.stop();
        }
    }, [clockRunning]);

    useEffect(() => {
        clock.staticTempo = staticTempo;
    }, [staticTempo]);

    return html`
        <div>
            <h5>clock</h5>
            <button disabled=${!!clockRunning} onClick=${clockStartHandler}>start</button>
            <button disabled=${!clockRunning} onClick=${clockStopHandler}>stop</button>

            <div>
                <label>
                    <input
                        checked=${clockSource === "static"}
                        type="radio"
                        name="clock-source"
                        value="static"
                        onClick=${clockSourceHandler}
                    />
                    <span class="label-text">static</span>
                </label>
                <input
                    type="range"
                    min=${STATIC_TEMPO_MIN}
                    max=${STATIC_TEMPO_MAX}
                    value=${staticTempo}
                    step="0.1"
                    onInput=${staticTempoHandler}
                />
                <span class="static-tempo-display">${staticTempo}</span>
            </div>

            <div>
                <label>
                    <input
                        checked=${clockSource === "heart-rate"}
                        type="radio"
                        name="clock-source"
                        value="heart-rate"
                        onClick=${clockSourceHandler}
                    />
                    <span class="label-text">heart-rate</span>
                </label>
                <input
                    type="number"
                    min="1"
                    max="12"
                    step="1"
                    size="2"
                    value=${numerator}
                    onChange=${numeratorHandler}
                />
                <input
                    type="number"
                    min="1"
                    max="12"
                    step="1"
                    size="2"
                    value=${denominator}
                    onChange=${denominatorHandler}
                />
                (${numerator} / ${denominator})
            </div>
        </div>
    `;
}

export default ClockView;

export {
    Clock,
    ClockView,
    ACTION,
    reducer,
    initialState
};
