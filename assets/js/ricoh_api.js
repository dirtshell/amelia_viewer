const THETA_IP_BOS = "192.168.1.27";    // IP of the theta on my network in BOS
const THETA_IP_ROC = "192.168.50.227";  // IP of the theta on my network in ROC
const CORS_ANYWHERE = "http://0.0.0.0:8080";    // Address for CORS reverse proxy
const THETA_USER = "THETAYL00164391";   // Username for the theta (aka serial #)
const THETA_PASS = "00164391"; // Password for the theta (last part of serial #)
const RERENDER_EVENT = "new_frame_loaded";  // name for the rerender event
const SKYBOX_ID = "preview_image";  // id of <a-sky> element to render stream to

// TODO: include digest-fetch-src.js
// TODO: include digestAuthRequest.js

/*
 * Disables the sleep and auto-power off on the Theta
 *  `sleepDelay = 65535` disables auto sleep
 *  `offDelay = 65535` disables auto off after standby (or 0?)
 */
function setThetaNeverSleep() {
    console.log("Disabling the Theta's sleep and autopower off");
    var endpoint = "/osc/commands/execute";
    var url = CORS_ANYWHERE + "/" + THETA_IP_BOS + endpoint;
    var getRequest = new digestAuthRequest('POST', url, THETA_USER, 
        THETA_PASS);
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
        console.log("Failure: " + errorCode);
    }, postData);
}


/*
 * Gets the Theta's info
 */
function getThetaInfo() {
    console.log("Getting the ricoh info");
    var endpoint = "/osc/info";
    var url = CORS_ANYWHERE + "/" + THETA_IP_BOS + endpoint;
    var getRequest = new digestAuthRequest('GET', url, THETA_USER, 
        THETA_PASS);
    
    // make the request
    getRequest.request(function(data) {
        console.log(data);
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
    var url = CORS_ANYWHERE + "/" + THETA_IP_BOS + endpoint;
    var getRequest = new digestAuthRequest('POST', url, THETA_USER, 
        THETA_PASS);
    var postData = null;

    // make the request
    getRequest.request(function(data) {
        console.log(data);
    },function(errorCode) {
        console.log("Failure: " + errorCode);
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
function setThetaLivePreview(w=1024, h=512, fps=30) {
    console.log("Setting the live preview settings to\n" + 
        "\tWidth: " + w + "\n\tHeight: " + h + "\n\tFPS: " + fps);
    var endpoint = "/osc/commands/execute";
    var url = CORS_ANYWHERE + "/" + THETA_IP_BOS + endpoint;
    var getRequest = new digestAuthRequest('POST', url, THETA_USER, 
        THETA_PASS);
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
        console.log("Failure: " + errorCode);
    }, postData);
}


/*
 * Gets a live preview from the camera
 */
function getThetaLivePreview() {
    const endpoint = "/osc/commands/execute";
    const url = CORS_ANYWHERE + "/" + THETA_IP_BOS + endpoint;
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
    const client = new DigestClient(THETA_USER, THETA_PASS, digestOptions) 

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


        // calculating fps and mbps. TODO: implement a floating window function.
        let frames = 0;
        let bytesThisSecond = 0;
        setInterval(() => {
            console.log("fps : " + frames);
            console.log("Mbps: " + (bytesThisSecond / (1000000/8)).toFixed(3));
            bytesThisSecond = 0;
            frames = 0;
        }, 1000) 


        const read = () => {

            reader.read().then(({done, value}) => {
                if (done) {
                    controller.close();
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
                        document.getElementById(SKYBOX_ID).dispatchEvent(
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
