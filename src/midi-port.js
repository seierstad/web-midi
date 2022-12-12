"use strict";
import {useState, useEffect} from "preact/hooks";
import {html} from "htm/preact";

const ACTION = {
    MIDI_PORT_OPEN: Symbol("MIDI_PORT_OPEN"),
    MIDI_PORT_CLOSE: Symbol("MIDI_PORT_CLOSE")
};

function MidiPort (props) {
    const {port, children, dispatch = () => null} = props;
    const [toggle, setToggle] = useState(false);
    const [open, setOpen] = useState(false);

    const toggleHandler = () => {
        setToggle(true);
    };

    useEffect(() => {
        (async () => {
            if (toggle) {
                if (port.connection === "open") {
                    await port.close();
                    setOpen(false);
                    dispatch({type: ACTION.MIDI_PORT_CLOSE, id: port.id, port_type: port.type});
                } else if (port.connection === "closed") {
                    await port.open();
                    setOpen(true);
                    dispatch({type: ACTION.MIDI_PORT_OPEN, id: port.id, port_type: port.type});
                }
                setToggle(false);
            }
        })();
    }, [toggle]);


    return html`
        <fieldset>
            <legend>${port.manufacturer} ${port.name}</legend>
            <button onClick=${toggleHandler}>${!open ? "open" : "close"}</button>
            ${open ? children : null}
        </fieldset>
    `;
}

export default MidiPort;

export {
    ACTION
};
