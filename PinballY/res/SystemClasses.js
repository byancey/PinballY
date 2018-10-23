// This file is part of PinballY
// Copyright 2018 Michael J Roberts | GPL v3 or later | NO WARRANTY
//
// ATTENTION!  This file must be stored as Unicode UTF-16LE text.
// ATTENTION!  This file must end in a null character (see comment at bottom)
//
// Javascript class framework for PinballY system objects.  This file is
// embedded in the PinballY executable as a resource and loaded at system
// startup.  This creates the pre-defined system objects and classes.


// ------------------------------------------------------------------------
//
// Define Event and EventTarget inside a function scope, so that
// we can define some private properties shared among these classes.
//
let { Event, EventTarget } = (() =>
{
    let _propagationStopped = Symbol("_propagationStopped");
    let _immediatePropagationStopped = Symbol("_immediatePropagationStopped");
    let _defaultPrevented = Symbol("_defaultPrevented");
    let _listeners = Symbol("_listeners");

    // Normalize the 'options' argument to addEventListener or removeEventListener.
    // For browser compatibility, this can be specified as a boolean 'capture'
    // value, or an object with properties giving the options.  We normalize it
    // the object format in all cases.
    let normalizeOptions = (options) => (
        (typeof options === "boolean") ? { capture: capture } : options ? options : { });

    // Add an event listener to an event target
    let add = (target, type, namespaces, listener, options) =>
    {
        // get or create the list of listeners for this event type name
        let lst = target[_listeners][type];
        if (!lst)
            target[_listeners][type] = lst = [];

        // add the new listener
        lst.push({ namespaces: namespaces, listener: listener, options });
    };

    // Internal common handler for eventTarget.on() and eventTarget.one()
    let on = (target, events, once, rest) =>
    {
        // rest can be [data, listener] or just [listener]
        let data = rest.length > 1 ? rest.shift() : undefined;
        let listener = rest[0];

        // build the options object
        let options = { data: data, once: once };

        // process the events
        for (let event of events.trim().split(/\s+/))
        {
            // separate the event name and namespace list
            let [type, ...namespaces] = event.split(".");
            
            // add the listener
            add(target, type, new Set(namespaces), listener, options);
        }
    };

    //
    // Event target.  This is a base class for objects that can be
    // receive events.
    //
    let EventTarget = class EventTarget
    {
        constructor() {
            this[_listeners] = { };
        }

        // Add an event listener.  Similar to the Web browser namesake.
        //
        // 'options' is an optional object containing additional arguments
        // as properties.  Recognized properties:
        //
        // once (boolean): if true, remove the event automatically after
        //   it fires for the first time
        //
        // data (anything): arbitrary user-defined value to be passed to
        //   the event handler in event.data each time it's called
        //    
        addEventListener(type, listener, options) {
            add(this, type, [], listener, normalizeOptions(options));
        }

        // jquery-style on(events, data, func).  'events' is a space-delimited
        // string of event names to bind; each event can optionally include a
        // list of dot-delimited namespaces, to identify the same item for
        // later removal via off().
        on(events, ...rest) { on(this, events, false, rest); }
        
        // jquery style one(events, data, func).  Same as on(), but registers
        // a once-only event.
        one(events, ...rest) { on(this, events, true, rest); }

        // jquery-style off(events, func).  'events' can include namespaces
        off(events, func)
        {
            // process the events
            for (let event of events.trim().split(/\s+/))
            {
                // separate the event name and namespace list
                let [type, ...namespaces] = event.split(".");

                // remove a single type
                let _off = (type) =>
                {
                    // if there's a listener list for this type, process it
                    let lst = this[_listeners][type];
                    if (lst)
                    {
                        // scan the list for matching items
                        for (let i = 0; i < lst.length; ++i)
                        {
                            // if a function was provided, and it doesn't match the
                            // listener on this item, don't remove this item
                            if (func !== undefined && func != lst[i].listener)
                                continue;

                            // if a namespace list was provided, check for a match
                            if (namespaces.length != 0)
                            {
                                // presume no match
                                let found = false;
                                let eventNamespaces = lst[i].namespaces;
                                for (let namespace of namespaces)
                                {
                                    if (eventNamespaces.has(namespace))
                                    {
                                        found = true;
                                        break;
                                    }
                                }

                                // stop if we didn't find a match
                                if (!found)
                                    continue;
                            }

                            // It passed all tests - remove it by splicing it out
                            // of the listener list.  Note that we then have to back
                            // up one slot in the list iteration to compensate.
                            lst.splice(i, 1);
                            --i;
                        }
                    }
                };

                // if type is empty, remove everything matching the namespace;
                // otherwise just process the type list
                if (type == "")
                {
                    for (let curtype in this[_listeners])
                        _off(curtype);
                }
                else
                {
                    // single event type only
                    _off(type);
                }
            }
        }

        removeEventListener(type, listener, options)
        {
            // proceed only if there are any listeners for this type
            var lst = this[_listeners][type];
            if (lst)
            {
                // normalize the options
                options = normalizeOptions(options);
                
                // scan the list for a match to the listener and 'capture' option
                for (let i = 0; i < lst.length; ++i)
                {
                    // check for a match
                    if (lst[i].listener == listener && !!lst[i].options.capture == !!options.capture)
                    {
                        // got it - remove it
                        lst.splice(i, 1);
                        --i;
                    }
                }
            }
        }

        dispatchEvent(event)
        {
            // get the listener list for this event type
            let lst = this[_listeners][event.type];
            if (lst)
            {
                // set up the current target on the event
                event.target = event.currentTarget = this;
                
                // iterate over a copy of the list, so that our iteration isn't
                // affected by changes made in the event handlers
                for (let l of [...lst])
                {
                    // set the event data to the data object from the options
                    event.data = l.options.data;

                    // Call the event, with 'this' set to the current target.
                    l.listener.call(this, event);

                    // if this was a once-only event, remove it
                    if (l.options.once)
                    {
                        for (let i = 0; i < lst.length; ++i)
                        {
                            if (Object.is(lst[i], l))
                            {
                                lst.splice(i, 1);
                                break;
                            }
                        }
                    }

                    // stop if immediate propagation was stopped
                    if (event[_immediatePropagationStopped])
                        break;
                }
            }

            // return "should we do the system processing?" - that is,
            // true if preventDefault was never called, or the event is
            // non-cancelable
            return !(event.cancelable && event.defaultPrevented);
        }
    };

    //
    // Base class for all events.  This is modeled on the Event class
    // used in Web browsers.
    //
    let Event = class Event
    {
        constructor(type, eventInit)
        {
            Object.defineProperty(this, "type", { value: type });
            Object.defineProperty(this, "bubbles", { value: !!eventInit.bubbles });
            Object.defineProperty(this, "cancelable", { value: !!eventInit.cancelable });
            Object.defineProperty(this, "timeStamp", { value: Date.now() });
            this[_propagationStopped] = false;
            this[_immediatePropagationStopped] = false;
            this[_defaultPrevented] = false;
        }

        // If the event is cancelable, cancel the system default action
        // from occurring.  This makes the system ignore the event after
        // all event listeners have returned, but doesn't affect propagation
        // to other event listeners.
        preventDefault()
        {
            if (this.cancelable)
                this[_defaultPrevented] = true;
        }

        // has the system default action been prevented?
        get defaultPrevented() { return this[_defaultPrevented]; }

        // Stop the event from bubbling to parent event target objects.
        // This doesn't stop 
        stopPropagation() { this[_propagationStopped] = true; }

        // Stop the event from propagating to any other event listeners,
        // including other listeners on the same target and listeners on
        // parent targets.
        stopImmediatePropagation()
        {
            this[_propagationStopped] = true;
            this[_immediatePropagationStopped] = true;
        }
    };

    return { Event: Event, EventTarget: EventTarget };
})();

// Command event.  This is fired on the main application object
// when a button mapped to a command is pressed.  The default system
// action is to carry out the command.
class CommandEvent extends Event
{
    constructor(command)
    {
        super("command", { cancelable: true });
        Object.defineProperty(this, "command", { value: command });
    }
}

// Base class for keyboard events
class KeyEvent extends Event
{
    constructor(type, vkey, key, code, location, repeat, background)
    {
        super(type, { cancelable: true });
        this.vkey = vkey;
        this.key = key;
        this.code = code;
        this.location = location;
        this.repeat = repeat;
        this.background = background;
    }
}

class KeyDownEvent extends KeyEvent
{
    constructor(vkey, key, code, location, repeat, background)
    {
        super("keydown", vkey, key, code, location, repeat, background);
    }
}

class KeyUpEvent extends KeyEvent
{
    constructor(vkey, key, code, location, repeat, background)
    {
        super("keyup", vkey, key,code, location, repeat, background);
    }
}

// key location codes
const KEY_LOCATION_STANDARD = 0;
const KEY_LOCATION_LEFT = 1;
const KEY_LOCATION_RIGHT = 2;
const KEY_LOCATION_NUMPAD = 3;

// aliases for the Web browser names for these constants, for people
// who are used to these
const DOM_KEY_LOCATION_STANDARD = 0;
const DOM_KEY_LOCATION_LEFT = 1;
const DOM_KEY_LOCATION_RIGHT = 2;
const DOM_KEY_LOCATION_NUMPAD = 3;

// Joystick button events
class JoystickButtonEvent extends Event
{
    constructor(type, unit, button, repeat, background)
    {
        super(type, { cancelable: true });
    }
}

class JoystickButtonDownEvent extends JoystickButtonEvent
{
    constructor(unit, button, repeat, background)
    {
        super("joystickbuttondown", unit, button, repeat, background);
    }
}

class JoystickButtonUpEvent extends JoystickButtonEvent
{
    constructor(unit, button, repeat, background)
    {
        super("joystickbuttonup", unit, button, repeat, background);
    }
}    

// Game launch event.  This is fired on the main application object
// when a game is about to be launched.
class LaunchEvent extends Event
{
    constructor()
    {
        super("launch", { cancelable: true });
    }
}


// ------------------------------------------------------------------------
//
// Main window object
//
// Events:
//    keydown
//    keyup
//    joydown
//    joyup
//    command
//
let mainWindow = new EventTarget();


// ------------------------------------------------------------------------
//
// Native DLL interface
//

class DllImport
{
    bind(dllName, signature)
    {
        var info = parseSignature(signature);
        var nativeFunc = _bind(dllName, info.funcName);
        return (...args) => (_call(this, info.signature, nativeFunc, ...args));
    }

    parseSignature(signature)
    {
        // parse out the main sections: <typeinfo> <name> ( <args> )
        if (!/([^\(]+)\(([^\)]*)\)/.exec(signature))
            throw "Invalid DllImport function signature syntax";

        var typeAndName = RegExp.$1.split(/\s+/);
        var args = RegExp.$2.split(/\s*,\s*/);

        // 
    }

    _bind(dllName, funcName) { OutputDebugString("bind(" + dllName + "," + funcName + ")\n"); }
}

// Map basic C++ primitive types and common aliases used in the Windows APIs
// to simple representation used in the C++ native callbacks.  
DllImport.primitiveTypes = {
    'bool': 'b',        // native boolean type
    'char': 'c',        // native char type
    CCHAR: 'c',
    INT8: 'c',
    'unsigned char': 'c',
    uchar: 'C',         // native unsigned char type
    BYTE: 'C',
    UINT8: 'C',
    BOOLEAN: 'C',
    __int8: 'c',
    __uint8: 'C',
    'short': 's',
    SHORT: 's',         // SHORT (16-bit signed)
    'unsigned short': 's',
    ushort: 'S',
    WORD: 'S',          // WORD (16-bit signed)
    ATOM: 'S',
    LANGID: 'S',
    INT16: 's',
    __int16: 's',
    USHORT: 'S',
    UINT16: 'S',
    __uint16: 'S',
    wchar_t: 'S',
    __wchar_t: 'S',
    'int': 'i',         // native int type
    'unsigned int': 'I',
    BOOL: 'i',
    INT: 'i',
    uint: 'I',          // native unsigned int type
    UINT: 'I',
    HFILE: 'I',
    HFONT: 'I',
    'long': 'i',
    LONG: 'i',
    LONG32: 'i',
    HRESULT: 'i',
    'ulong': 'I',
    ULONG: 'I',
    ULONG32: 'I',
    __int32: 'i',
    __uint32: 'I',
    DWORD: 'I',         // DWORD (32-bit unsigned)
    DWORD32: 'I',
    COLORREF: 'I',
    LCTYPE: 'I',
    LGRPID: 'I',
    'long long': 'l',
    'unsigned long long': 'L',
    __int64: 'l',
    __uint64: 'L',
    INT64: 'l',
    LONGLONG: 'l',
    UINT64: 'L',
    DWORDLONG: 'L',
    DWORD64: 'L',
    'float': 'f',
    FLOAT: 'f',
    'double': 'd',
    DOUBLE: 'd',
    'long double': 'd',
    DWORD_PTR: 'P',     // int type big enough for a pointer
    LPARAM: 'P',
    WPARAM: 'P',
    LONG_PTR: 'P',
    HANDLE: 'P',        // Windows handle type: a void*
    HACCEL: 'P',
    HDC: 'P',
    HGDIOBJ: 'P',
    HBITMAP: 'P',
    HCOLORSPACE: 'P',
    HCONV: 'P',
    HCURSOR: 'P',
    HDDEDATA: 'P',
    HDESC: 'P',
    HDROP: 'P',
    HDWP: 'P',
    HENHMETAFILE: 'P',
    HGLOBAL: 'P',
    HHOOK: 'P',
    HICON: 'P',
    HINSTANCE: 'P',
    HKEY: 'P',
    HKL: 'P',
    HLOCAL: 'P',
    HMENU: 'P',
    HMETAFILE: 'P',
    HMODULE: 'P',
    HMONITOR: 'P',
    HPALETTE: 'P',
    HPEN: 'P',
    HRGN: 'P',
    HRSRC: 'P',
    HSZ: 'H',
    HWINSTA: 'H',
    HWND: 'H',
    LPCSTR: 't',
    LPSTR: 't',
    LPCTSTR: 'T',
    LPTSTR: 'T',
    LPCWSTR: 'T',
    LPWSTR: 'T',
    VOID: 'v'
};

// Default DllImport instance.  Each instance acts as a namespace for
// imported functions and struct definitions.  If multiple namespaces
// are needed (for different DLLs with conflicting struct type names,
// for example), additional instances can be created as needed.
let dllImport = new DllImport();


// ------------------------------------------------------------------------
//
// NB - this file must end with a null character, because the ChakraCore
// API we use to evaluate the script takes the script text as a null-
// terminated string.  We *could* instead make a copy of the script in
// memory after loading it, and add the null at the end of the copy, but
// that seems inefficient for such a simple thing that we could handle
// here.  It's not actually important that the null be the last
// character of the whole file; the null only has to be after the last
// *meaningful* character, since the script evaluator API will stop
// reading text at the first null.  Anything past this point will be
// ignored.

 // <-- NULL CHARACTER - Unicode 0x0000
