var audioContext = new webkitAudioContext();
var AUDIOBUFFERSIZE = 2048;

// a global reference to the ScriptProcessorNode has to be kept around,
// otherwise functionality just stops.
// I think it's a bug in Canary but on the forum they seem to have
// dismissed it.
var jpnode;

//The timer allows sounds to be played on the measure and keeps everything
//in sync.
//timer represents when the last bar started.
var timer = 0;
//tempDelay is used to store when a clip started recording
//relative to timer. Eventually this gets stored in SoundObject.delay
var tempDelay = 0;
var tempo = 120;    

var soundObjects = [];
var stacks = [];

//mode is either:
//'Metronome' -- the length of a loop is based on 4 beats of a metronome.
//'Free' -- the length of a loop is the same length as the first recording.
var mode;

/* Sound Object Stack
*
* A stack of Sound Objects that moves together, and loops.
* keeps an array of Sound Objects ordered by position.
* index 0 is the bottom, index 1 is above that, etc.
*
*
*/

var SoundObjectStack = function() {
    this.sos = [];
}

/* Sound Object
*
* These are the objects that make up the program.
* They can play sounds, loop sounds, interact with each other,
* move, and other things as well.
* They can also have effects nodes.
*
*/

var currentID = 0;

var SoundObject = function() {
    this.id = ++currentID;
    this.gain = audioContext.createGainNode();
    this.gain.connect(audioContext.destination);
    this.sound = null;
    this.beingDragged = false;
    this.startedPlaying = 0;
    this.stacked =  false;
    this.stack = null;
    this.position = { x: 0, y: 0 };
    this.offset = { x: 0, y: 0};
    this.size = 30;
    this.color = { h: 0, s: 0, b: 0};
}

SoundObject.prototype.isInRegion = function(region) {
    return this.position.x === region.x &&
        this.position.y === region.y;
}

SoundObject.prototype.isInAnyRegion = function() {
    for(var r in visualizer.regions) {
        if(this.isInRegion(visualizer.regions[r]) &&
            visualizer.activeRegion.indexOf(r) !== -1) {
            return true;
        }
    }
    return false;
}

SoundObject.prototype.addToStack = function(stack, pos) {
    if(pos !== undefined) {
        //splice can be used to insert elements by making the second parameter 0
        stack.sos.splice(pos,0,this.id);
    } else {
        stack.sos.push(this.id);
    }
    this.stacked = true;
    this.stack = stack;
}

SoundObject.prototype.removeFromStack = function(stack) {

}

//use this to write to the server.
//takes out unnecessary and circular references.
SoundObject.prototype.exportAsJSON = function() {
    var jso = {};
    //base64encode the sound;
    this.encodeSound();
    jso.sound = this.sound;
    jso.sound.endSource = null; //circular reference
    jso.startedPlaying = this.startedPlaying;
    jso.stacked = this.stacked;
    jso.stack = this.stack;
    jso.position = this.position;
    jso.offset = this.offset;
    jso.color = this.color;
    jso.size = this.size;
    return jso;
}

//essentially 
SoundObject.prototype.importFromJSON = function(jso) {
    this.sound = jso.sound;
    this.decodeSound();
    this.startedPlaying = jso.startedPlaying;
    this.stacked = jso.stacked;
    this.stack = jso.stack;
    this.position = jso.position;
    this.offset = jso.offset;
    this.color = jso.color;
    this.size = jso.size;
}

SoundObject.prototype.encodeSound = function() {
    for(b in this.sound.buffers) {
        var buffer = this.sound.buffers[b];
        this.sound.buffers[b].encodedAudio = _arrayBufferToBase64(buffer.getChannelData(0).buffer);
    }
}

SoundObject.prototype.decodeSound = function() {
    var buffersArray = this.sound.buffers;
    var newLongAudio = new LongAudioSource();
    for(b in buffersArray) {
        var buffer = buffersArray[b];
        var ab = decode(buffer.encodedAudio);
        var f32 = new Float32Array(ab);
        buffersArray[b] = AudioBufferFromFloat32(f32);
        newLongAudio.addToBuffers(buffersArray[b]);
    }
    this.sound = newLongAudio;
}

function decircularizeAll() {
    var a = [];
    for(i in soundObjects) {
        a.push( soundObjects[i].exportAsJSON() );
    }
    return {
        "soundobjects": a
    }
}

function soundObjectByID(id) {
    for( i in soundObjects ) {
        if(soundObjects[i].id == id) {
            return soundObjects[i];
        }
    }
    return null; 
}

/* Metronome Sound Object
*
* A sound object that plays the metronome.
* It doesn't have a LongAudioSource,
* but instead two AudioBuffers for tick and tock.
*
*/

MetronomeSoundObject = new SoundObject();

MetronomeSoundObject.color = {
    r: 128,
    g: 128,
    b: 128
}

MetronomeSoundObject.size = 30;

MetronomeSoundObject.gain = audioContext.createGainNode();
MetronomeSoundObject.gain.connect(audioContext.destination);

MetronomeSoundObject.position = {
    x: 10,
    y: 12
}

MetronomeSoundObject.sounds = [];

MetronomeSoundObject.loadSound = function(url, pos) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    request.onload = function() {
      audioContext.decodeAudioData(request.response, function(buffer) {
        MetronomeSoundObject.sounds[pos] = (buffer);
      }, function() {
        //error decoding
      });
    }

    request.onerror = function() {
        //on localhost (and file://) XMLHttpRequests will be denied.
        //let's just make an empty buffer.
        MetronomeSoundObject.sounds[pos] = audioContext.createBuffer(1, AUDIOBUFFERSIZE, 44100);
    }
    request.send(); 
}

MetronomeSoundObject.loadSound("sounds/tick.wav", 0);
MetronomeSoundObject.loadSound("sounds/tock.wav", 1);

MetronomeSoundObject.tick = function() {
    var source = audioContext.createBufferSource();
    source.buffer = MetronomeSoundObject.sounds[0];
    source.connect(MetronomeSoundObject.gain);
    source.noteOn(0);
}

MetronomeSoundObject.tock = function() {
    var source = audioContext.createBufferSource();
    source.buffer = MetronomeSoundObject.sounds[1];
    source.connect(MetronomeSoundObject.gain);
    source.noteOn(0);
}

MetronomeSoundObject.play = function() {
    var quarterTime = (60000 / tempo);
    this.startedPlaying = new Date().getTime();
    MetronomeSoundObject.tick();
    window.setTimeout(MetronomeSoundObject.tock, quarterTime);
    window.setTimeout(MetronomeSoundObject.tock, quarterTime*2);
    window.setTimeout(MetronomeSoundObject.tock, quarterTime*3);
}



/* Long Audio Source
*
* A helper class that stores an array of buffers and plays them all.
* This is necessary because if an ArrayBuffer holds >1s of data,
* it starts to become glitchy and playback suffers.
*
*/
var LongAudioSource = function(initialBuffer) {
    this.buffers = [];
    if(initialBuffer !== undefined)
        this.buffers.push(initialBuffer);
    this.looped = false;
    this.delay = 0;
    this.endSource = null;
}

LongAudioSource.prototype.addToBuffers = function(buffer) {
        this.buffers.push(buffer);
}

LongAudioSource.prototype.play = function(node) {
        var totalTime = 0;
        for(var i = 0; i < this.buffers.length; i++) {
            var source = audioContext.createBufferSource();
            source.buffer = this.buffers[i];
            source.connect(node);
            if(i == 0) {
                source.start(0);
            } else {
                totalTime += this.buffers[i - 1].duration;
                source.start(audioContext.currentTime + totalTime);
            }
            if(i == this.buffers.length - 1) {
                this.endSource = source;
            }
        }
}

LongAudioSource.prototype.loop = function(node) {
        this.looped = true;
        this.play(node);
}

LongAudioSource.prototype.stop = function() {
        for(var i = 0; i < this.buffers.length; i++) {
            this.buffers[i].stop(0);
        }
}

LongAudioSource.prototype.clone = function() {
        var clone = new LongAudioSource();
        for(var i = 0; i < this.buffers.length; i++) {
            clone.buffers[i] = AudioBufferFromFloat32(this.buffers[i].getChannelData(0));
        }
        clone.looped = this.looped;
        return clone;
}

LongAudioSource.prototype.getDuration = function() {
        var d = 0;
        for(var i = 0; i < this.buffers.length; i++) {
            d += this.buffers[i].duration;
        }
        return d;
}

var clip = new LongAudioSource(audioContext.createBuffer(1, AUDIOBUFFERSIZE, 44100));
var recording = false; 

/* via Frédéric Hamidi on StackOverflow */
function Float32Concat(first, second)
{
    var firstLength = first.length;
    var result = new Float32Array(firstLength + second.length);

    result.set(first);
    result.set(second, firstLength);

    return result;
}

/* helper function.
* Essentially this just expands the inner Float32 array
* inside an AudioBuffer
*
* Also I use this to clone AudioBuffers.
*
*/
function AudioBufferFromFloat32( F32Array ) {
    var newBuffer = audioContext.createBuffer(1, F32Array.length, 44100);
    for(var i = 0; i < newBuffer.length; i++) {
        newBuffer.getChannelData(0)[i] = F32Array[i];
    }
    return newBuffer;
}


// success callback when requesting audio input stream
function gotStream(stream) {
    // Create an AudioNode from the stream.
    var mediaStreamSource = audioContext.createMediaStreamSource( stream );
    // Create a Javascript Processor Node to process the audio
    jpnode = audioContext.createScriptProcessor(AUDIOBUFFERSIZE, 1, 1);
    jpnode.onaudioprocess = function(ape) {            
        if(recording) {
            if(clip.buffers[clip.buffers.length - 1].getChannelData(0)[AUDIOBUFFERSIZE - 1] == 0) {
                //new buffers start out with AUDIOBUFFERSIZE samples of silence,
                //this overwrites that.
                clip.buffers[clip.buffers.length - 1] = ape.inputBuffer;
                return;
            }
            if(clip.buffers[clip.buffers.length - 1].getChannelData(0).length >= (AUDIOBUFFERSIZE*50)) {
                //if the current buffer reaches an unweildly size,
                //add a new buffer and begin recording to that one instead.
                clip.addToBuffers(audioContext.createBuffer(1, AUDIOBUFFERSIZE, 44100));
            }
            var newF32 = Float32Concat( clip.buffers[clip.buffers.length - 1].getChannelData(0), 
                                        ape.inputBuffer.getChannelData(0) );
            clip.buffers[clip.buffers.length - 1] = AudioBufferFromFloat32(newF32);
        }
    } //end onaudioprocess

    // Connect it up!
    mediaStreamSource.connect( jpnode );
    jpnode.connect( audioContext.destination );
}

function stopRecording(){
    recording = false;
    jpnode.disconnect();
}

function startRecording(m) {
    mode = m;
    $("#blank-start-container").hide();
	navigator.webkitGetUserMedia({audio:true}, gotStream);
}

function loadSong() {
    var idstring = urlParams.s;
    var lssc = $("#load-song-start-container");
    lssc.find("p").text("loading...");
    lssc.find(".start-button").hide();
    $.ajax({
        type: "GET",
        url: "http://do.robertvinluan.com:1337/load/"+idstring,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(data) {
            console.log(data);
            for(i in data) {
                var s = new SoundObject();
                s.importFromJSON(data[i]);
                soundObjects.push(s);
            }
            $("#load-song-start-container").hide();
            navigator.webkitGetUserMedia({audio:true}, gotStream);
        },
        error: function(data) {
            lssc.find("p").text("There was an error in loading the song. Please refresh the page and try again.");
        }
    })
}

function playClip() {
    clip.loop();
}

function playDelayedSoundClosure(whichSO) {
    soundObjects[whichSO].sound.play(soundObjects[whichSO].gain);
    soundObjects[whichSO].startedPlaying = new Date().getTime();
}

//checks if it's at the beginning of the loop again.
function check() {
    if(!jpnode) {
        return;
    }
    for (var i = 0; i < soundObjects.length; i++) {
        if(soundObjects[i].isInAnyRegion() ||
            (soundObjects[i].stacked && soundObjectByID(soundObjects[i].stack.sos[0]).isInAnyRegion())) {
            soundObjects[i].gain.gain.value = 1;
        } else {
            soundObjects[i].gain.gain.value = 0;
        }
    }
    if((new Date().getTime() - timer) >= (60000 / tempo)*4) {
            //one bar has passed
            MetronomeSoundObject.play();
            timer = new Date().getTime();
            for (var i = 0; i < soundObjects.length; i++) {
                window.setTimeout(playDelayedSoundClosure, soundObjects[i].delay, i);
            }
    }
}

//loop this check 60 times a second
window.setInterval(check, 1000/60);

function createNewSoundObjectFromClip(clip, td) {
    var so = new SoundObject();
    so.sound = clip.clone();
    so.delay = td;

    so.position = {
        x: Math.round(Math.random() * 13) + 2, //max 25 (visualizer.gridNumber)
        y: Math.round(Math.random() * 13) + 2, //same
    };
    so.size = 30;
    if(!SoundObject.prototype.lastHue) {
        SoundObject.prototype.lastHue = Math.round(Math.random() * 255);
    } else if(SoundObject.prototype.lastHue >= 255) {
        SoundObject.prototype.lastHue = 0;
    }
    so.color = {
        h: SoundObject.prototype.lastHue + 20,
        s: Math.round(Math.random() * 50) + 140,
        b: Math.round(Math.random() * 155) + 100
    }
    SoundObject.prototype.lastHue += 20;
    so.stackDistance = {
        x: 0,
        y: 0
    }
    soundObjects.push(so);
}

function toggleRegion(regionName) {
    if(visualizer.activeRegion.indexOf(regionName) === -1) {
        visualizer.activeRegion += regionName;
    } else {
        visualizer.activeRegion = visualizer.activeRegion.replace(regionName, '');
    }
}

window.onload = function() {

    /* Attach keyboard listeners */
    document.getElementsByTagName('BODY')[0].addEventListener('keydown', function(event){
        switch(event.keyCode) {
            case 82 : //R
                if(!jpnode) { return }
                if(!recording) {
                    recording = true;
                    tempDelay = new Date().getTime() - timer;
                }
                break;
            case 65: //a
                toggleRegion('a');
                break;
            case 83: //s
                toggleRegion('s');
                break;    
            case 68: //d
                toggleRegion('d');
                break;
            case 70: //f
                toggleRegion('f');
                break;
            case 71: //g
                toggleRegion('g');
                break;
            case 72: //h
                toggleRegion('h');
                break;    
            case 74: //j
                toggleRegion('j');
                break;
            case 75: //k
                toggleRegion('k');
                break;    
            case 76: //l
                toggleRegion('l');
                break;
            console.log(visualizer.activeRegion);    
        }
    });        
    document.getElementsByTagName('BODY')[0].addEventListener('keyup', function(event){
        switch(event.keyCode) {
            case 82 :  //R
                if(!jpnode) { return }
                if(recording) {
                    recording = false;
                    createNewSoundObjectFromClip(clip, tempDelay);
                    clip = new LongAudioSource(audioContext.createBuffer(1, AUDIOBUFFERSIZE, 44100));
                    tempDelay = 0;
                }
                break;
        }
    });  

    //center the start button
    var bsb = $('#blank-start-container');
    var lssb = $('#load-song-start-container');
    var asc = $('#after-save-container');
    var cv = $('#canvas');
    bsb.css({
        top: (cv.height()/2) - (bsb.height()/2),
        left: (cv.width()/2) - (bsb.width()/2)
    });
    lssb.css({
        top: (cv.height()/2) - (lssb.height()/2),
        left: (cv.width()/2) - (lssb.width()/2)
    });

    //start the visualization
    visualizer.init(soundObjects);
}

