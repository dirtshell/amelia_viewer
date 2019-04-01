/*
 * A-Frame component that rerenders the image in an `<a-sky>` whenever a
 * `rerender_sky` event is occurs. `rerender_sky` events are triggered
 * whenever a new frame is received, but can be setup to be triggered
 * on an interval to achieve a framerate independent of the actual video
 * framerate.
 */
AFRAME.registerComponent('refresh-event', {
    schema: {
        trigger_event: {type: 'string'},    // event that triggers the refresh
    },

    init: function() {
        var data = this.data;
        var el = this.el;

        document.addEventListener(data.trigger_event, function(e) {
            //console.log("Received rerender event with object URL = " + e.detail);
            
            // Setup an event listener for when the image loads and needs to be updated
            // TODO: still getting issues about loading an image halfway
            el.object3DMap.mesh.material.map.image.addEventListener('load', function() {
                el.object3DMap.mesh.material.map.needsUpdate = true;
            });
            el.object3DMap.mesh.material.map.image.src = e.detail;
        });
    },
});
