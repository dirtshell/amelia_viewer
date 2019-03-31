/* Constants */
const CORS_ANYWHERE = "http://127.0.0.1:8080";    // Address for CORS reverse proxy
const RERENDER_EVENT = "new_frame_loaded";  // name for the rerender event
const STREAM_STOPPED_EVENT = "stream_stopped";
const STREAM_STARTED_EVENT = "stream_started";
const SKYBOX_ID = "preview_image";  // id of <a-sky> element to render stream to

/* SETTINGS */
var settings = {
    theta_ip: "255.255.255.255",    // IP of the theta
    theta_user: "THETAYL00164391",  // Username for the theta (aka serial #)
    theta_pass: "00164391",         // Password for the theta (last part of serial #)
    theta_res_x: 1024,              // horizontal resolution of the stream
    theta_res_y: 512,               // vertical resolution of the stream
    theta_fps: 30,                  // fps of the stream
    record_locally: false,          // record the video locally (maybe shouldn't be here?)
    record_dir: ""                  // where to record the video locally
};

/* STATUS */
var thetaStatus = {
    streamingInternal: false,
    streamingListener: function(val) {},
    set streaming(val) {
        this.streamingInternal = val;
        this.streamingListener(val);
    },
    get streaming() {
        return this.streamingInternal;
    },
    registerListener: function(listener) {
        this.streamingListener = listener;
    }
}

document.addEventListener(STREAM_STOPPED_EVENT, function (e) { 
    thetaStatus.streaming = false; }, false);

document.addEventListener(STREAM_STARTED_EVENT, function (e) {
    thetaStatus.streaming = true; }, false);


// TODO: include digest-fetch-src.js
// TODO: include digestAuthRequest.js
// TODO: include asyn.min.js


/*
 * Disables the sleep and auto-power off on the Theta
 *  `sleepDelay = 65535` disables auto sleep
 *  `offDelay = 65535` disables auto off after standby (or 0?)
 */
function setThetaNeverSleep() {
    console.log("Disabling the Theta's sleep and autopower off");
    var endpoint = "/osc/commands/execute";
    var url = CORS_ANYWHERE + "/" + settings.theta_ip + endpoint;
    var getRequest = new digestAuthRequest('POST', url, settings.theta_user, 
        settings.theta_pass);
    var postData = { 
        "name": "camera.setOptions",
        "parameters": {
            "options": {
                "sleepDelay": 65535,
                "offDelay": 65535
            }
        }
    };

    // make the request
    getRequest.request(function(data) {
        console.log(data);
    },function(errorCode) {
        throw(errorCode);
    }, postData);
}


/*
 * Gets the Theta's info
 */
function getThetaInfo() {
    console.log("Getting the ricoh info");
    var endpoint = "/osc/info";
    var url = CORS_ANYWHERE + "/" + settings.theta_ip + endpoint;
    var getRequest = new digestAuthRequest('GET', url, settings.theta_user, 
        settings.theta_pass);
    
    // make the request
    getRequest.request(function(data) {
        console.log(data);
        return data;
    },function(errorCode) {
        console.log("Failure: " + errorCode);
    });
}


/* 
 * Gets the Theta's state
 */
function getThetaState() {
    console.log("Getting the ricoh state");
    var endpoint = "/osc/state";
    var url = CORS_ANYWHERE + "/" + settings.theta_ip + endpoint;
    var getRequest = new digestAuthRequest('POST', url, settings.theta_user, 
        settings.theta_pass);
    var postData = null;

    // make the request
    getRequest.request(function(data) {
        console.log(data);
    },function(errorCode) {
        throw(errorCode);
    }, postData);
}


/*
 * Sets the Theta's live preview resolution and framerate
 * 
 * Valid Configs (w, h, fps):
 *  - 1920, 960, 8
 *  - 1024, 512, 30
 *  - 1024, 512, 8
 *  - 640, 320, 30
 *  - 640, 320, 8
 */
function setThetaLivePreview(w=settings.theta_res_x, h=settings.theta_res_y, 
        fps=settings.theta_fps) {
    console.log("Setting the live preview settings to\n" + 
        "\tWidth: " + w + "\n\tHeight: " + h + "\n\tFPS: " + fps);
    var endpoint = "/osc/commands/execute";
    var url = CORS_ANYWHERE + "/" + settings.theta_ip + endpoint;
    var getRequest = new digestAuthRequest('POST', url, settings.theta_user, 
        settings.theta_pass);
    var postData = { 
        "name": "camera.setOptions",
        "parameters": {
            "options": {
                "previewFormat": {
                    "width": w,
                    "height": h,
                    "framerate": fps
                }
            }
        }
    };

    // make the request
    getRequest.request(function(data) {
        console.log(data);
    },function(errorCode) {
        throw(errorCode);
    }, postData);
}

/*
 * Stops a live preview from the camera by taking a video
 * TODO: delete the temp video created to stop the stream
 * TODO: find a better way of stopping the recording
 */
function stopThetaLivePreview() {
    // Start a capture
    console.log("Stop the Theta live preview");
    var endpoint = "/osc/commands/execute";
    var url = CORS_ANYWHERE + "/" + settings.theta_ip + endpoint;
    var startRequest = new digestAuthRequest('POST', url, settings.theta_user, 
        settings.theta_pass);
    var startData = { 
        "name": "camera.startCapture",
    };
    startRequest.request(function(data) {
        console.log(data);
    },function(errorCode) {
        throw errorCode;
    }, startData);


    // SUPER grimey way to make sure we stop recording 
    // TODO: use async, since this method doesn't wait for the prev req to fail
    var maxIters = 10;
    var iterNum = 0;
    const stopRecording = function () {
        var result;
        iterNum = iterNum + 1;
        
        console.log("Trying to stop the stream (attempt " + iterNum + ")");
        var stopRequest = new digestAuthRequest('POST', url, settings.theta_user, 
            settings.theta_pass);
        var stopData = { 
            "name": "camera.stopCapture",
        };

        // make the request
        stopRequest.request(function(data) {
            console.log(data);
            clearInterval(retryIntervalId); // stop attempting to stop
            thetaStatus.streaming = false;  // stop getThetaLivePreview()
            var stopEvent = new Event(STREAM_STOPPED_EVENT);
            document.dispatchEvent(stopEvent);
        },function(errorCode) {
            throw errorCode;
        }, stopData);
        
        // Stop retrying if we are at max tries
        if (iterNum >= maxIters) {
            clearInterval(retryIntervalId);
        }
    };
    var retryIntervalId = setInterval(stopRecording, 500);
}

/*
 * Gets a live preview from the camera
 * This is a modified version of this: https://github.com/aruntj/mjpeg-readable-stream/blob/master/index.html
 * TODO: automatically stop when the theta stops sending video using timeout or something
 */
function getThetaLivePreview() {
    const endpoint = "/osc/commands/execute";
    const url = CORS_ANYWHERE + "/" + settings.theta_ip + endpoint;
    const postData = { name: "camera.getLivePreview" };
    
    const SOI = new Uint8Array(2);
    SOI[0] = 0xFF;
    SOI[1] = 0xD8;
    const CONTENT_LENGTH = 'Content-Length';
    const TYPE_JPEG = 'image/jpeg';

    // Use digest fetch
    const digestOptions = {
      cnonceSize: 16,  // length of cnonce, default: 32
      logger: console, // logger for debug, default: none
      algorithm: 'MD5' // only 'MD5' is supported now
    }
    const client = new DigestClient(settings.theta_user, settings.theta_pass, digestOptions) 

    client.fetch(url, {
        method: 'POST',
        body: JSON.stringify(postData),
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => {
        if (!response.ok) {
            throw Error(response.status+' '+response.statusText)
        }

        if (!response.body) {
            throw Error('ReadableStream not yet supported in this browser.')
        }
        

        const reader = response.body.getReader();

        let headers = '';
        let contentLength = -1;
        let imageBuffer = null;
        let bytesRead = 0;
        let lastFrameImgUrl = null;

        // Signal that we have started streaming
        var startEvent = new Event(STREAM_STARTED_EVENT);
        document.dispatchEvent(startEvent);

        // Stop when the stream stops
        document.addEventListener(STREAM_STOPPED_EVENT, function(e) { return; }, false);

        // calculating fps and mbps. TODO: implement a floating window function.
        let frames = 0;
        let bytesThisSecond = 0;
        setInterval(() => {
            var mbps = (bytesThisSecond / (1000000/8)).toFixed(3);
            console.log("fps : " + frames + " @ " + mbps + " Mbps");
            bytesThisSecond = 0;
            frames = 0;
        }, 1000) 


        const read = () => {

            reader.read().then(({done, value}) => {
                if (done) {
                    return;
                }
                
                for (let index =0; index < value.length; index++) {
                    
                    // Start of the frame, everything we've till now was header
                    if (value[index] === SOI[0] && value[index+1] === SOI[1]) {
                        contentLength = getLength(headers);
                        imageBuffer = new Uint8Array(
                            new ArrayBuffer(contentLength));
                    }
                    // we're still reading the header.
                    if (contentLength <= 0) {
                        headers += String.fromCharCode(value[index]);
                    }
                    // we're now reading the jpeg. 
                    else if (bytesRead < contentLength){
                        imageBuffer[bytesRead++] = value[index];
                        bytesThisSecond++;
                    }
                    // we're done reading the jpeg. Time to render it. 
                    else {
                        //console.log("jpeg read with bytes : " + bytesRead);
                        
                        // Generate blob of the image and emit event
                        lastFrameImgUrl = URL.createObjectURL(
                            new Blob([imageBuffer], {type: TYPE_JPEG}));
                        var reRenderEvent = new CustomEvent(RERENDER_EVENT, 
                            { detail: lastFrameImgUrl });
                        document.dispatchEvent(
                            reRenderEvent);

                        // Reset for the frame
                        frames++;
                        contentLength = 0;
                        bytesRead = 0;
                        headers = '';
                    }
                }

                read();
            }).catch(error => {
                console.error(error);
            })
        }
        
        read();
        
    }).catch(error => {
        //thetaStatus.streaming = false;  // we are no longer connected
        var stopEvent = new Event(STREAM_STOPPED_EVENT);
        document.dispatchEvent(stopEvent);
        console.error(error);
    })

    // Gets the length of an MJPEG chunk from the headers of a stream
    const getLength = (headers) => {
        let contentLength = -1;
        headers.split('\n').forEach((header, _) => {
            const pair = header.split(':');
            if (pair[0] === CONTENT_LENGTH) {
            contentLength = pair[1];
            }
        })
        return contentLength;
    };
}

