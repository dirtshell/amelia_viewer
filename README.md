Native app for viewing a 360 livestream from the Ricoh Theta in a VR headset

Built using:

* Node.js
* Electron
* A-Frame
* Three.js

### Installation
TBD

### Example of `settings.json`

```
{ connection:
   { ip: '192.168.1.1', username: 'default', password: 'default' },
  video:
   { resolution_x: '1920',
     resolution_y: '960',
     fps: '30',
     record_locally: 'true',
     recording_directory: './made/up/dir' } 
}
```


### Goals

* Make the rerender event be imported or something so I don't just have a magic
string
* Add proper inclusions to my JS because IDK wtf I am doing 
* ~~Add application menu~~
* Implement a real UI
    * Settings window
        * Connect settings fields to `electron-settings`
        * Sidebar menu
            * Make the edges of the settings window rounded
            * Remove the outline when a button pressed
            * ~~Add state toggling for the menu labels and containers~~
            * Add animation to the save and cancel buttons
        * Connection page
        * Video page
        * General page
    * Home screen
    * VR View
* ~~Reorganize code so we don't have a ton of JS code in `index.html`~~
* Rewrite FPS and Mbps calculation code
* Write a Ricoh Theta to allow for 4K @ 30 FPS
* Method for stopping a stream
* Auto reset video stream when resolution changes
    * Stop recording with old res
    * Start recording with new res
* Add recording feature
* Actually test with Occulus lol

